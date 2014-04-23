/**
 * @fileoverview WebSocket client implementation
 */

'use strict';

var WebSocket = require('./websocket');
var Stream = require('./stream');
var MessageType = require('./message_type');
var IncomingPayloadType = require('./incoming_payload_type');
var Deferred = require('./../lib/deferred');
var Promise = require('./../lib/promise');
var vLog = require('./../lib/vlog');
var IdlHelper = require('./../idl/idl');
var ServiceWrapper = IdlHelper.ServiceWrapper;


/**
 * A client for the veyron service using websockets. Connects to the veyron HTTP
 * proxy and performs RPCs.
 * @constructor
 * @param {string} url of the http proxy that connects to the veyron network
 * @param {string} [ privateIdentity = null ] private key for the user's veyron
 * identity
 */
function ProxyConnection(url, privateIdentityPromise) {
  this.url = url.replace(/^(http|https)/, 'ws') + '/ws';
  this.privateIdentityPromise = privateIdentityPromise;
  // We use odd numbers for the message ids, so that the server can use even
  // numbers.
  this.id = 1;
  this.outstandingRequests = {};
  this.currentWebSocketPromise;
  this.registeredServices = {};
}

function getDeferred(cb) {
  return new Deferred(cb);
}

/**
 * Connects to the server and returns an open web socket connection
 * @return {promise} a promise that will be fulfilled with a websocket object
 * when the connection is established.
 */
ProxyConnection.prototype.getWebSocket = function() {

  // We are either connecting or already connected, return the same promise
  if (this.currentWebSocketPromise) {
    return this.currentWebSocketPromise;
  }

  // TODO(bjornick): Implement a timeout mechanism.
  var websocket = new WebSocket(this.url);
  var self = this;
  var deferred = getDeferred();
  this.currentWebSocketPromise = deferred.promise;
  websocket.onopen = function() {
    vLog.info('Connected to proxy at', self.url);
    deferred.resolve(websocket);
  };

  websocket.onerror = function(e) {
    vLog.error('Failed to connect to proxy at url:', self.url);
    deferred.reject(e);
  };

  websocket.onmessage = function(frame) {
    var message;
    try {
      message = JSON.parse(frame.data);
    } catch (e) {
      vLog.warn('Failed to parse ' + frame.data);
      return;
    }

    // Messages originating from server are even numbers
    var isServerOriginatedMessage = (message.ID % 2) === 0;

    var def = self.outstandingRequests[message.ID];

    var payload;
    try {
      payload = JSON.parse(message.Data);
    } catch (e) {
      if (!isServerOriginatedMessage) {
        def.reject(message.Data);
        delete self.outstandingRequests[message.ID];
      }
      return;
    }

    // If we don't know about this flow, just drop the message. Unless it
    // originated from the sever.
    if (!isServerOriginatedMessage && !def) {
      vLog.warn('Dropping message for unknown flow ' + message.ID + ' ' +
          message.Data);
      return;
    }

    switch (payload.Type) {
      case IncomingPayloadType.FINAL_RESPONSE:
        if (payload.Message.length === 1) {
          payload.Message = payload.Message[0];
        }
        def.resolve(payload.Message);
        break;
      case IncomingPayloadType.STREAM_RESPONSE:
        try {
          if (def.onmessage) {
            def.onmessage(payload.Message);
          }
          return;
          // Return so we don't remove the promise from the queue.
        } catch (e) {
          def.reject(e);
        }
        break;
      case IncomingPayloadType.ERROR_RESPONSE:
        def.reject(payload.Message);
        break;
      case IncomingPayloadType.INVOKE_REQUEST:
        self.handleIncomingInvokeRequest(message.ID, payload.Message);
        return;
      case IncomingPayloadType.STREAM_CLOSE:
        def.resolve();
        return;
      default:
        def.reject(new Error('Received unknown response type from http proxy'));
    }
    delete self.outstandingRequests[message.ID];
  };

  return deferred.promise;
};

/**
 * Invoke a veyron method via rpc.
 * @param {string} name object name.
 * @param {string} methodName the name of the method to invoke
 * @param {object} [ mapOfArgs = {} ] key-value map of argument names to values
 * @param {number} numOutArgs Number of expected outputs by the method
 * @param {boolean} isStreaming true if this rpc is streaming.
 * @param {function} [callback] a callback that should take two arguments:
 * an error and the result.  If the rpc returns multiple arguments result will
 * be an array of values.
 * @return {promise} a promise to a return argument key value map
 * (for multiple return arguments)
 */
ProxyConnection.prototype.promiseInvokeMethod = function(name,
    methodName, mapOfArgs, numOutArgs, isStreaming, callback) {
  var def = getDeferred(callback);

  var self = this;
  this.privateIdentityPromise.then(function(privateIdentity) {
    var message = self.constructMessage(name,
        methodName, mapOfArgs, numOutArgs, isStreaming,
        privateIdentity);

    if (isStreaming) {
      var stream = new Stream(self.id, self.getWebSocket(), callback);
      def.resolve(stream);
      def = stream;
    }

    self.sendRequest(message, MessageType.REQUEST, def);
  }, function(msg) {
      def.reject(msg);
    }
  );

  return def.promise;
};

/**
 * Establishes the connection if needed, frames the message with the next id,
 * adds the given deferred to outstanding requests queue and sends the request
 * to the server
 * @param {Object} message Message to send
 * @param {MessageType} type Type of message to send
 * @param {Deferred} def Deferred to add to outstandingRequests
 */
ProxyConnection.prototype.sendRequest = function(message, type, def) {
  this.outstandingRequests[this.id] = def;

  var body = JSON.stringify({ id: this.id, data: message, type: type });

  this.getWebSocket().then(function(websocket) {
    websocket.send(body);
  },function(e) {
    def.reject(e);
  });

  this.id += 2;
};

/**
 * Injects the injections into the right positions in args and
 * returns what was injected.
 * @param {Array} args The arguments to inject into.
 * @param {Object} injectionPositions A map of injected variables to the
 * position to put in args.
 * @param {Object} injections A map of injected variables to values.
 * @return {Array} the array of variables that were injected.
 */
var inject = function(args, injectionPositions, injections) {
  var keys = Object.keys(injectionPositions);
  var invertedMap = {};
  keys.forEach(function(key) {
    invertedMap[injectionPositions[key]] = key;
  });
  var values = keys.map(function getValue(k) {
    return injectionPositions[k];
  });
  values.filter(function removeUndefined(value) {
    return value !== undefined;
  });
  values.sort();
  var keysInserted = [];
  values.forEach(function actuallyInject(pos) {
    var key = invertedMap[pos];
    args.splice(pos, 0, injections[key]);
    keysInserted.push(key);
  });
  return keysInserted;
};

/**
 * Handles incoming requests from the server to invoke methods on registered
 * services in JavaScript.
 * @param {string} messageId Message Id set by the server.
 * @param {Object} request Invocation request JSON. Request's structure is
 * {
 *   'Name': string // Name under which the service is registered
 *   'Method': string // Name of the method on the service to call
 *   'Args': [] // Array of positional arguments to be passed into the method
 * }
 */
ProxyConnection.prototype.handleIncomingInvokeRequest = function(messageId,
    request) {

  var self = this;
  var err;

  // Find the service
  var serviceWrapper = this.registeredServices[request.Name];
  if (serviceWrapper === undefined) {
    err = new Error('No registered service found for ' + request.Name);
    this.sendInvokeRequestResult(messageId, null, err);
    return;
  }

  var serviceObject = serviceWrapper.object;

  // Find the method
  var serviceMethod = serviceObject[request.Method];
  if (serviceMethod === undefined) {
    err = new Error('Requested method ' + request.Method +
        ' not found on the service registered under ' + request.Name);
    this.sendInvokeRequestResult(messageId, null, err);
    return;
  }
  var metadata = serviceWrapper.metadata[request.Method];

  // Invoke the method
  try {
    var args = request.Args;
    var finished = false;

    var cb = function callback(e, v) {
      if (finished) {
        return;
      }
      finished = true;
      self.sendInvokeRequestResult(messageId, v, e);
    };
    var injections = {
      '$stream' : new Stream(messageId, this.getWebSocket()),
      '$callback': cb
    };

    if (request.Method === 'MultiGet') {
      console.log('foo');
    }
    var variables = inject(args, metadata.injections, injections);
    if (variables.indexOf('$stream') !== -1) {
      self.outstandingRequests[messageId] = injections['$stream'];
    }
    
    // Call the registered method on the requested service
    // TODO(aghassemi) Context injection for special arguments like $PATH
    var result = serviceMethod.apply(serviceObject, args);

    // Normalize result to be a promise
    var resultPromise = Promise.cast(result);

    if (variables.indexOf('$callback') !== -1) {
      // The callback takes care of sending the result, so we don't use the
      // promises.
      return;
    }

    // Send the result back to the server
    resultPromise.then(function(value) {
      if (finished) {
        return;
      }
      finished = true;
      self.sendInvokeRequestResult(messageId, value, null);
    }, function(err) {
      if (finished) {
        return;
      }
      finished = true;
      self.sendInvokeRequestResult(messageId, null, err);
    });
  } catch (e) {
    // Frame any exceptions from method invocation
    err = new Error('Requested method ' + request.Method +
        ' threw an exception on invoke' + e);
    self.sendInvokeRequestResult(messageId, null, err);
  }
};

/**
 * Sends the result of a requested invocation back to the http proxy
 * @param {string} messageId Message id of the original invocation request
 * @param {Object} value Result of the call
 * @param {Object} error Error from the call
 */
ProxyConnection.prototype.sendInvokeRequestResult = function(messageId, value,
    error) {

  // JavaScript functions always return one result even if null or undefined
  var results = [value];

  var responseData = {
    'Results' : results,
    'Err' : (error !== null) ? error + '' : null // Stringify the error
  };

  var responseDataJSON = JSON.stringify(responseData);

  var body = JSON.stringify({ id: messageId,
    data: responseDataJSON,
    type: MessageType.RESPONSE });

  this.getWebSocket().then(function(websocket) {
    websocket.send(body);
  });
  delete this.outstandingRequests[messageId];
};

/**
 * Registers a service object under a prefix name
 * @param {string} name The name to register the service under
 * @param {Object} serviceObj service object.
 * @param {function} [callback] if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when register completes or fails
 */
ProxyConnection.prototype.registerService = function(
  name, serviceObj, callback) {
  //TODO(aghassemi) Handle registering after publishing

  var def = getDeferred(callback);

  var promise = def.promise;

  if (this.registeredServices[name] !== undefined) {
    var err = new Error('Service already registered under name: ' + name);
    def.reject(err);
  } else {
    this.registeredServices[name] = new ServiceWrapper(serviceObj);
    def.resolve();
  }

  return promise;
};

/**
 * Publishes the server under a name
 * @param {string} name Name to publish under
 * @param {function} [callback] If provided, the function will be called when
 * the  publish completes.  The first argument passed in is the error if there
 * was any and the second argument is the endpoint.
 * @return {Promise} Promise to be called when publish completes or fails
 * the endpoint string of the server will be returned as the value of promise
 */
ProxyConnection.prototype.publishServer = function(name, callback) {
  //TODO(aghassemi) Handle publish under multiple names

  vLog.info('Publishing a server under name: ', name);

  // Generate IDL for the registered services
  var idl = this.generateIdlWireDescription();

  var messageJSON = {
    'Name': name,
    'Services': idl
  };

  var def = getDeferred(callback);

  var promise = def.promise;

  var message = JSON.stringify(messageJSON);
  // Send the publish request to the proxy
  this.sendRequest(message, MessageType.PUBLISH, def);
  
  return promise;
};

/**
 * Gets the signature including methods names, number of arguments for a given
 * service name.
 * @param {string} name the veyron name of the service to get signature for.
 * @return {Promise} Signature of the service in JSON format
 */
ProxyConnection.prototype.getServiceSignature = function(name) {

  var def = getDeferred();

  var self = this;
  this.privateIdentityPromise.then(function(privateIdentity) {
    var messageJSON = {
      'Name': name,
      'PrivateID': privateIdentity
    };
    var message = JSON.stringify(messageJSON);

    // Send the get signature request to the proxy
    self.sendRequest(message, MessageType.SIGNATURE, def);
  }, function(reason) {
    def.reject('Failed to get service signature: ' + reason);
  });

  return def.promise;
};

/**
 * Generates an IDL wire description for all the registered services
 * @return {object} map from service name to idl wire description
 */
ProxyConnection.prototype.generateIdlWireDescription = function() {
  var servicesIdlWire = {};

  for (var serviceName in this.registeredServices) {
    if (this.registeredServices.hasOwnProperty(serviceName)) {
      var serviceMetadata = this.registeredServices[serviceName];
      servicesIdlWire[serviceName] =
          IdlHelper.generateIdlWireDescription(serviceMetadata);
    }
  }

  return servicesIdlWire;
};

/**
 * Construct a message to send to the veyron http proxy.
 * @param {string} name veyron name.
 * @param {string} methodName the name of the method to invoke.
 * @param {object} [ mapOfArgs = {} ] key-value map of argument names to values
 * @param {number} numOutArgs Number of expected outputs by the method
 * @param {boolean} isStreaming
 * @param {string} privateIdentity The private identity
 * @return {string} json string to send to the http proxy
 */
ProxyConnection.prototype.constructMessage = function(name, methodName,
    mapOfArgs, numOutArgs, isStreaming, privateIdentity) {
  var jsonMessage = {
    'Name' : name,
    'Method' : methodName,
    'InArgs' : mapOfArgs || {},
    'NumOutArgs' : numOutArgs || 0,
    'IsStreaming' : isStreaming,
    'PrivateID' : privateIdentity || null
  };
  return JSON.stringify(jsonMessage);
};

/**
 * Export the module
 */
module.exports = ProxyConnection;
