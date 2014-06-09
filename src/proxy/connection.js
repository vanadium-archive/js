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

// Cache the service signatures for one hour.
var BIND_CACHE_TTL = 3600 * 1000;

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
  this.bindCache = {};
  this._configDeferred = new Deferred();
  this.config = this._configDeferred.promise;
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
  var receivedConfig = false;
  var deferred = new Deferred();
  this.currentWebSocketPromise = deferred.promise;
  websocket.onopen = function() {
    vLog.info('Connected to proxy at', self.url);
    deferred.resolve(websocket);
  };
  var configDeferred = this._configDeferred;
  websocket.onerror = function(e) {
    vLog.error('Failed to connect to proxy at url:', self.url);
    deferred.reject(e);
    configDeferred.reject(
      'Proxy connection closed, failed to get config ' + e);
  };

  websocket.onmessage = function(frame) {
    var message;
    try {
      message = JSON.parse(frame.data);
    } catch (e) {
      vLog.warn('Failed to parse ' + frame.data);
      return;
    }

    if (receivedConfig === false) { // first message is the config.
      receivedConfig = true;
      configDeferred.resolve(message);
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

    var dequeue = function() {
      // If there is a stream associated with this request, then close it.
      if (def && def.stream) {
        def.stream._queueRead(null);
      }
      delete self.outstandingRequests[message.id];
    };

    var handleFinalResponse = function() {
      if (payload.message.length === 1) {
        payload.message = payload.message[0];
      }
      def.resolve(payload.message);
      dequeue();
    };

    var handleStreamResponse = function() {
      if (def && def.stream) {
        try {
          def.stream._queueRead(payload.message);
        } catch (e) {
          def.reject(e);
          dequeue();
        }
      }
    };

    var handleErrorResponse = function() {
      var err = ErrorConversion.toJSerror(payload.message);
      if (def.stream) {
        def.stream.emit('error', err);
      }
      def.reject(err);
      dequeue();
    };

    var handleStreamClose = function() {
      if (def) {
        if (def.stream) {
          def.stream._queueRead(null);
        }
        def.resolve();
      }
      dequeue();
    };

    switch (payload.type) {
      case IncomingPayloadType.FINAL_RESPONSE:
        return handleFinalResponse();
      case IncomingPayloadType.STREAM_RESPONSE:
        return handleStreamResponse();
      case IncomingPayloadType.ERROR_RESPONSE:
        return handleErrorResponse();
      case IncomingPayloadType.INVOKE_REQUEST:
        return self.handleIncomingInvokeRequest(message.id, payload.message);
      case IncomingPayloadType.STREAM_CLOSE:
        return handleStreamClose();
      default:
        def.reject(new Error('Received unknown response type from wspr'));
        dequeue();
        return;
    }
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
  var id = this.id;
  this.id += 2;

  var streamingDeferred = null;
  if (isStreaming) {
    streamingDeferred = new Deferred();
    def.stream = new Stream(id, streamingDeferred.promise, true);
    def.promise.stream = def.stream;
  }
  var self = this;
  this.privateIdentityPromise.then(function(privateIdentity) {
    var message = self.constructMessage(name,
        methodName, mapOfArgs, numOutArgs, isStreaming,
        privateIdentity);

    self.sendRequest(message, MessageType.REQUEST, def, id);
    if (streamingDeferred) {
      self.currentWebSocketPromise.then(function(ws) {
        streamingDeferred.resolve(ws);
      });
    }
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
 * @param {Number} id if provided, use this flow id instead of generating
 * a new one.
 * @param {Deferred} def Deferred to add to outstandingRequests
 */
ProxyConnection.prototype.sendRequest = function(message, type, def, id) {
  if (id === undefined) {
    id = this.id;
    this.id += 2;
  }

  this.outstandingRequests[id] = def;
  var body = JSON.stringify({ id: id, data: message, type: type });

  this.getWebSocket().then(function(websocket) {
    websocket.send(body);
  },function(e) {
    def.reject(e);
  });
};

/**
 * Injects the injections into the eight positions in args and
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
    this.sendInvokeRequestResult(messageId, request.method, null, err);
    return;
  }

  // Find the service
  var serviceWrapper = server.getServiceObject(request.serviceName);
  if (serviceWrapper === undefined) {
    err = new Error('No registered service found for ' + request.serviceName);
    this.sendInvokeRequestResult(messageId, request.method, null, err);
    return;
  }

  var serviceObject = serviceWrapper.object;

  // Find the method
  var serviceMethod = serviceObject[request.method];
  if (serviceMethod === undefined) {
    err = new Error('Requested method ' + request.method +
        ' not found on the service registered under ' + request.serviceName);
    this.sendInvokeRequestResult(messageId, request.Name, null, err);
    return;
  }
  var metadata = serviceWrapper.metadata[request.method];

  var sendInvocationError = function(e, metadata) {
    var stackTrace;
    if (e instanceof Error && e.stack !== undefined) {
      stackTrace = e.stack;
    }
    vLog.debug('Requested method ' + request.method +
      ' threw an exception on invoke: ', e, stackTrace);
    var numReturnArgs = metadata.numReturnArgs;
    var result;
    switch (numReturnArgs) {
      case 0:
        break;
      case 1:
        result = null;
        break;
      default:
        result = new Array(numReturnArgs);
    }
    self.sendInvokeRequestResult(messageId, request.method, result, e,
                                 metadata);
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
      self.sendInvokeRequestResult(messageId, request.method,
                                   v, e, metadata);
    };

    var context = {
      suffix: request.context.suffix,
      name: request.context.name,
    };

    var injections = {
      '$stream' : new Stream(messageId, this.getWebSocket(), false),
      '$callback': cb,
      '$context': context,
      '$suffix': context.suffix,
      '$name': context.name
    };

    var variables = inject(args, metadata.injections, injections);
    if (variables.indexOf('$stream') !== -1) {
      var def = new Deferred();
      def.stream = injections['$stream'];
      self.outstandingRequests[messageId] = def;
    }

    // Call the registered method on the requested service
    var result = serviceMethod.apply(serviceObject, args);
    if (result instanceof Error) {
      sendInvocationError(result, metadata);
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
      self.sendInvokeRequestResult(messageId, request.method, value,
                                   null, metadata);
    }, function(err) {
      if (finished) {
        return;
      }
      finished = true;
      sendInvocationError(err, metadata);
    });
  } catch (e) {
    sendInvocationError(e, metadata);
  }
};

/**
 * Sends the result of a requested invocation back to wspr
 * @param {string} messageId Message id of the original invocation request
 * @param {string} name Name of method
 * @param {Object} value Result of the call
 * @param {Object} err Error from the call
 * @param {Object} metadata Metadata about the function.
 */
ProxyConnection.prototype.sendInvokeRequestResult = function(messageId, name,
    value, err, metadata) {
  var results = [];

  if (metadata) {
    switch (metadata.numReturnArgs) {
      case 0:
        if (value !== undefined) {
          vLog.error('Unexpected return value from ' + name + ': ' + value);
        }
        results = [];
        break;
      case 1:
        results = [value];
        break;
      default:
        if (Array.isArray(value)) {
          if (value.length !== metadata.numReturnArgs) {
            vLog.error('Wrong number of arguments returned by ' + name +
                '. expected: ' + metadata.numReturnArgs + ', got:' +
                value.length);
          }
          results = value;
        } else {
          vLog.error('Wrong number of arguments returned by ' + name +
              '. expected: ' + metadata.numReturnArgs + ', got: 1');
          results = [value];
        }
    }
  }

  var errorStruct = null;
  if (err !== undefined && err !== null) {
    errorStruct = ErrorConversion.toStandardErrorStruct(err);
  }

  // If this is a streaming request, queue up the final response after all
  // the other stream requests are done.
  var def = this.outstandingRequests[messageId];
  if (def && def.stream) {
    def.stream.serverClose(value, errorStruct);
  } else {
    var responseData = {
      results: results,
      err: errorStruct
    };

    var responseDataJSON = JSON.stringify(responseData);

    var body = JSON.stringify({ id: messageId,
      data: responseDataJSON,
      type: MessageType.RESPONSE });

    this.getWebSocket().then(function(websocket) {
      websocket.send(body);
    });
  }
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
  var cachedEntry = this.bindCache[name];
  var now = new Date();
  if (cachedEntry && now - cachedEntry.fetched < BIND_CACHE_TTL) {
    return Promise.cast(cachedEntry.signature);
  }

  var def = new Deferred();

  var self = this;
  def.promise.then(function(signature) {
    self.bindCache[name] = {
      signature: signature,
      fetched: now
    };
  });
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
