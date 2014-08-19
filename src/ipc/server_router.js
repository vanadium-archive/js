/**
 * @fileoveriew A router that handles incoming server rpcs.
 */

var Promise = require('es6-promise').Promise;

var Stream = require('../proxy/stream');
var MessageType = require('../proxy/message_type');
var IncomingPayloadType = require('../proxy/incoming_payload_type');
var ErrorConversion = require('../proxy/error_conversion');
var Deferred = require('./../lib/deferred');
var vLog = require('./../lib/vlog');
var SimpleHandler = require('../proxy/simple_handler');
var PublicId = require('../security/public');


var ServerStream = function(stream) {
  this._stream = stream;
};

ServerStream.prototype.handleResponse = function(type, data) {
  switch (type) {
    case IncomingPayloadType.STREAM_RESPONSE:
      this._stream._queueRead(data);
      break;
    case IncomingPayloadType.STREAM_CLOSE:
      this._stream._queueRead(null);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      this._stream.emit('error', ErrorConversion.toJSerror(data));
      break;
  }
};

/**
 * A router that handles routing incoming requests to the right
 * server
 * @constructor
 */
var Router = function(proxy) {
  this._servers = {};
  this._proxy = proxy;
  this._streamMap = {};
  proxy.addIncomingHandler(IncomingPayloadType.INVOKE_REQUEST, this);
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

// Wraps the call to the method with a try block in the smallest
// function possible, so that v8 de-optimizes as little as possible.
Router.prototype.invokeMethod = function (receiver, method, args) {
  // Call the registered method on the requested service
  try {
    return method.apply(receiver, args);
  } catch (e) {
    if (e instanceof Error) {
      return e;
    }
    return new Error(e);
  }
};

/**
 * Handles incoming requests from the server to invoke methods on registered
 * services in JavaScript.
 * @param {string} messageId Message Id set by the server.
 * @param {Object} request Invocation request JSON. Request's structure is
 * {
 *   serverId: number // the server id
 *   method: string // Name of the method on the service to call
 *   args: [] // Array of positional arguments to be passed into the method
 * }
 */

Router.prototype.handleRequest = function(messageId, request) {
  var err;
  var server = this._servers[request.serverId];
  if (!server) {
    err = new Error('Request for unknown server ' + request.serverId);
    this.sendResult(messageId, request.method, null, err);
    return;
  }

  var serviceWrapper = server.serviceObject;
  if (!serviceWrapper) {
    err = new Error('No service found');
    this.sendResulttResult(messageId, request.method, null, err);
    return;
  }

  var serviceObject = serviceWrapper.object;

  // Find the method
  var serviceMethod = serviceObject[request.method];
  if (serviceMethod === undefined) {
    err = new Error('Requested method ' + request.method +
        ' not found on');
    this.sendResult(messageId, request.method, null, err);
    return;
  }
  var metadata = serviceWrapper.metadata[request.method];

  var self = this;
  var sendInvocationError = function(e, metadata) {
    var stackTrace;
    if (e instanceof Error && e.stack !== undefined) {
      stackTrace = e.stack;
    }
    vLog.debug('Requested method ' + request.method +
        ' threw an exception on invoke: ', e, stackTrace);
    var numOutArgs = metadata.numOutArgs;
    var result;
    switch (numOutArgs) {
      case 0:
        break;
      case 1:
        result = null;
        break;
      default:
        result = new Array(numOutArgs);
    }
    self.sendResult(messageId, request.method, result, e,
        metadata);
  };
  var args = request.args;

  // Create callback to pass to the function, if it is requested.
  var finished = false;
  var cb = function callback(e, v) {
    if (finished) {
      return;
    }
    finished = true;
    self.sendResult(messageId, request.method, v, e, metadata);
  };

  var context = {
    suffix: request.context.suffix,
    name: request.context.name,
    remoteId: new PublicId(request.context.remoteID.names)
  };

  var injections = {
    $stream: new Stream(messageId, this._proxy.senderPromise, false),
    $callback: cb,
    $context: context,
    $suffix: context.suffix,
    $name: context.name,
    $remoteId: context.remoteId
  };

  var variables = inject(args, metadata.injections, injections);
  if (variables.indexOf('$stream') !== -1) {
    var stream = injections['$stream'];
    this._streamMap[messageId] = stream;
    var rpc = new ServerStream(stream);
    this._proxy.addIncomingStreamHandler(messageId, rpc);
  }

  // Invoke the method
  var result = this.invokeMethod(serviceObject, serviceMethod, args);

  if (result instanceof Error) {
    sendInvocationError(result, metadata);
    return;
  }

  // Normalize result to be a promise
  var resultPromise = Promise.resolve(result);

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
    self.sendResult(messageId, request.method, value,
        null, metadata);
  }, function(err) {
    if (finished) {
      return;
    }
    finished = true;
    sendInvocationError(err, metadata);
  });
};

/**
 * Sends the result of a requested invocation back to jspr
 * @param {string} messageId Message id of the original invocation request
 * @param {string} name Name of method
 * @param {Object} value Result of the call
 * @param {Object} err Error from the call
 * @param {Object} metadata Metadata about the function.
 */
Router.prototype.sendResult = function(messageId, name, value, err, metadata) {
  var results = [];
  if (metadata) {
    switch (metadata.numOutArgs) {
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
          if (value.length !== metadata.numOutArgs) {
            vLog.error('Wrong number of arguments returned by ' + name +
                '. expected: ' + metadata.numOutArgs + ', got:' +
                value.length);
          }
          results = value;
        } else {
          vLog.error('Wrong number of arguments returned by ' + name +
              '. expected: ' + metadata.numOutArgs + ', got: 1');
          results = [value];
        }
    }
  } else {
    results = [value];
  }

  var errorStruct = null;
  if (err !== undefined && err !== null) {
    errorStruct = ErrorConversion.toStandardErrorStruct(err);
  }

  // If this is a streaming request, queue up the final response after all
  // the other stream requests are done.
  var stream = this._streamMap[messageId];
  if (stream) {
    // We should probably remove the stream from the dictionary, but it's
    // not clear if there is still a reference being held elsewhere.  If there
    // isn't, then GC might prevent this final message from being sent out.
    stream.serverClose(value, errorStruct);
    this._proxy.dequeue(messageId);
  } else {
    var responseData = {
      results: results,
      err: errorStruct
    };

    var responseDataJSON = JSON.stringify(responseData);
    this._proxy.sendRequest(responseDataJSON, MessageType.RESPONSE, null,
        messageId);
  }
};

/**
 * Serves the server under the given name
 * @param {string} name Name to serve under
 * @param {Veyron.Server} The server who will handle the requests for this
 * name.
 * @param {function} [callback] If provided, the function will be called when
 * serve completes.  The first argument passed in is the error if there
 * was any and the second argument is the endpoint.
 * @return {Promise} Promise to be called when serve completes or fails
 * the endpoint string of the server will be returned as the value of promise
 */
Router.prototype.serve = function(name, server, callback) {
  vLog.info('Serving under the name: ', name);

  var messageJSON = {
    name: name,
    serverId: server.id,
    service: server.generateIdlWireDescription()
  };

  this._servers[server.id] = server;

  var def = new Deferred(callback);
  var message = JSON.stringify(messageJSON);
  var id = this._proxy.id;
  this._proxy.id += 2;
  var handler = new SimpleHandler(def, this._proxy, id);
  // Send the serve request to the proxy
  this._proxy.sendRequest(message, MessageType.SERVE, handler, id);

  return def.promise;
};

/**
 * Sends a stop server request to jspr.
 * @param {Server} server Server object to stop.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when stop service completes or fails
 */
Router.prototype.stopServer = function(server, callback) {
  var self = this;

  var def = new Deferred(callback);
  var id = this._proxy.id;
  this._proxy.id += 2;
  var handler = new SimpleHandler(def, this._proxy, id);
  // Send the stop request to jspr
  this._proxy.sendRequest(server.id.toString(), MessageType.STOP, handler, id);

  return def.promise.then(function(result) {
    delete self._servers[server.id];
    return result;
  });
};


module.exports = Router;
