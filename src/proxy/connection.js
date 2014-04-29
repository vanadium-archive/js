/**
 * @fileoverview WebSocket client implementation
 */

'use strict';

var WebSocket = require('./websocket');
var Stream = require('./stream');
var MessageType = require('./message_type');
var IncomingPayloadType = require('./incoming_payload_type');
var ErrorConversion = require('./error_conversion');
var Deferred = require('./../lib/deferred');
var Promise = require('./../lib/promise');
var vLog = require('./../lib/vlog');


/**
 * A client for the veyron service using websockets. Connects to the veyron wspr
 * and performs RPCs.
 * @constructor
 * @param {string} url of wspr that connects to the veyron network
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
  this.servers = {};
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
  var deferred = new Deferred();
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
    var isServerOriginatedMessage = (message.id % 2) === 0;

    var def = self.outstandingRequests[message.id];

    var payload;
    try {
      payload = JSON.parse(message.data);
    } catch (e) {
      if (!isServerOriginatedMessage) {
        def.reject(message.data);
        delete self.outstandingRequests[message.id];
      }
      return;
    }

    // If we don't know about this flow, just drop the message. Unless it
    // originated from the sever.
    if (!isServerOriginatedMessage && !def) {
      vLog.warn('Dropping message for unknown flow ' + message.id + ' ' +
          message.data);
      return;
    }

    switch (payload.type) {
      case IncomingPayloadType.FINAL_RESPONSE:
        if (payload.message.length === 1) {
          payload.message = payload.message[0];
        }
        def.resolve(payload.message);
        break;
      case IncomingPayloadType.STREAM_RESPONSE:
        try {
          if (def.onmessage) {
            def.onmessage(payload.message);
          }
          return;
          // Return so we don't remove the promise from the queue.
        } catch (e) {
          def.reject(e);
        }
        break;
      case IncomingPayloadType.ERROR_RESPONSE:
        def.reject(ErrorConversion.toJSerror(payload.message));
        break;
      case IncomingPayloadType.INVOKE_REQUEST:
        self.handleIncomingInvokeRequest(message.id, payload.message);
        return;
      case IncomingPayloadType.STREAM_CLOSE:
        def.resolve();
        return;
      default:
        def.reject(new Error('Received unknown response type from wspr'));
    }
    delete self.outstandingRequests[message.id];
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
  var def = new Deferred(callback);
  var promise = def.promise;

  var streamingDeferred = null;
  if (isStreaming) {
    streamingDeferred = new Deferred();
    def = new Stream(this.id, streamingDeferred.promise, callback);
    promise = def;
  }
  var self = this;
  this.privateIdentityPromise.then(function(privateIdentity) {
    var message = self.constructMessage(name,
        methodName, mapOfArgs, numOutArgs, isStreaming,
        privateIdentity);

    self.sendRequest(message, MessageType.REQUEST, def);
    if (streamingDeferred) {
      self.currentWebSocketPromise.then(function(ws) {
        streamingDeferred.resolve(ws);
      });
    }
  }, function(msg) {
      def.reject(msg);
    }
  );

  return promise;
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
  var id = this.id;
  this.id += 2;

  this.outstandingRequests[id] = def;
  var body = JSON.stringify({ id: id, data: message, type: type });

  this.getWebSocket().then(function(websocket) {
    websocket.send(body);
  },function(e) {
    def.reject(e);
  });
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

  var server = this.servers[request.serverId];
  if (server === undefined) {
    err = new Error(request.serverName + ' is not a configured server');
    this.sendInvokeRequestResult(messageId, null, err);
    return;
  }

  // Find the service
  var serviceWrapper = server.getServiceObject(request.serviceName);
  if (serviceWrapper === undefined) {
    err = new Error('No registered service found for ' + request.serviceName);
    this.sendInvokeRequestResult(messageId, null, err);
    return;
  }

  var serviceObject = serviceWrapper.object;

  // Find the method
  var serviceMethod = serviceObject[request.method];
  if (serviceMethod === undefined) {
    err = new Error('Requested method ' + request.method +
        ' not found on the service registered under ' + request.serviceName);
    this.sendInvokeRequestResult(messageId, null, err);
    return;
  }
  var metadata = serviceWrapper.metadata[request.method];

  var sendInvocationError = function(e) {
    var stackTrace;
    if (e instanceof Error && e.stack !== undefined) {
      stackTrace = e.stack;
    }
    vLog.debug('Requested method ' + request.method +
      ' threw an exception on invoke: ', e, stackTrace);

    self.sendInvokeRequestResult(messageId, null, e);
  };

  // Invoke the method
  try {
    var args = request.args;
    var finished = false;

    var cb = function callback(e, v) {
      if (finished) {
        return;
      }
      finished = true;
      self.sendInvokeRequestResult(messageId, v, e);
    };

    var context = {
      suffix: request.context.suffix,
      name: request.context.name,
    };

    var injections = {
      '$stream' : new Stream(messageId, this.getWebSocket()),
      '$callback': cb,
      '$context': context,
      '$suffix': context.suffix,
      '$name': context.name
    };

    var variables = inject(args, metadata.injections, injections);
    if (variables.indexOf('$stream') !== -1) {
      self.outstandingRequests[messageId] = injections['$stream'];
    }

    // Call the registered method on the requested service
    var result = serviceMethod.apply(serviceObject, args);
    if (result instanceof Error) {
      sendInvocationError(result);
      return;
    }

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
      sendInvocationError(err);
    });
  } catch (e) {
    sendInvocationError(e);
  }
};

/**
 * Sends the result of a requested invocation back to wspr
 * @param {string} messageId Message id of the original invocation request
 * @param {Object} value Result of the call
 * @param {Object} err Error from the call
 */
ProxyConnection.prototype.sendInvokeRequestResult = function(messageId, value,
    err) {

  // JavaScript functions always return one result even if null or undefined
  var results = [value];

  var errorStruct = null;
  if (err !== undefined && err !== null) {
    errorStruct = ErrorConversion.toStandardErrorStruct(err);
  }

  var responseData = {
    'results' : results,
    'err' : errorStruct
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
 * Publishes the server under a name
 * @param {string} name Name to publish under
 * @param {Object.<string, Object>} services Map of service name to idl wire
 * description.
 * @param {function} [callback] If provided, the function will be called when
 * the  publish completes.  The first argument passed in is the error if there
 * was any and the second argument is the endpoint.
 * @return {Promise} Promise to be called when publish completes or fails
 * the endpoint string of the server will be returned as the value of promise
 */
ProxyConnection.prototype.publishServer = function(name, server, callback) {
  //TODO(aghassemi) Handle publish under multiple names

  vLog.info('Publishing a server under name: ', name);

  var messageJSON = {
    'name': name,
    'serverId': server.id,
    'services': server.generateIdlWireDescription()
  };

  this.servers[server.id] = server;

  var def = new Deferred(callback);
  var message = JSON.stringify(messageJSON);
  // Send the publish request to the proxy
  this.sendRequest(message, MessageType.PUBLISH, def);

  return def.promise;
};

/**
 * Gets the signature including methods names, number of arguments for a given
 * service name.
 * @param {string} name the veyron name of the service to get signature for.
 * @return {Promise} Signature of the service in JSON format
 */
ProxyConnection.prototype.getServiceSignature = function(name) {

  var def = new Deferred();

  var self = this;
  this.privateIdentityPromise.then(function(privateIdentity) {
    var messageJSON = {
      'name': name,
      'privateId': privateIdentity
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
 * Construct a message to send to the veyron wspr
 * @param {string} name veyron name.
 * @param {string} methodName the name of the method to invoke.
 * @param {object} [ mapOfArgs = {} ] key-value map of argument names to values
 * @param {number} numOutArgs Number of expected outputs by the method
 * @param {boolean} isStreaming
 * @param {string} privateIdentity The private identity
 * @return {string} json string to send to wspr
 */
ProxyConnection.prototype.constructMessage = function(name, methodName,
    mapOfArgs, numOutArgs, isStreaming, privateIdentity) {
  var jsonMessage = {
    'name' : name,
    'method' : methodName,
    'inArgs' : mapOfArgs || {},
    'numOutArgs' : numOutArgs || 2,
    'isStreaming' : isStreaming,
    'privateId' : privateIdentity || null
  };
  return JSON.stringify(jsonMessage);
};

/**
 * Export the module
 */
module.exports = ProxyConnection;
