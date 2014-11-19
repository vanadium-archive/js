/**
 * @fileoveriew A router that handles incoming server rpcs.
 */

var Promise = require('../lib/promise');
var Stream = require('../proxy/stream');
var MessageType = require('../proxy/message_type');
var IncomingPayloadType = require('../proxy/incoming_payload_type');
var ErrorConversion = require('../proxy/error_conversion');
var Deferred = require('./../lib/deferred');
var vLog = require('./../lib/vlog');
var SimpleHandler = require('../proxy/simple_handler');
var StreamHandler = require('../proxy/stream_handler');
var vError = require('../lib/verror');
var IdlHelper = require('./../idl/idl');
var SecurityContext = require('../security/context');
var ServerContext = require('./server_context');
var DecodeUtil = require('../lib/decode_util');

/**
 * A router that handles routing incoming requests to the right
 * server
 * @constructor
 */
var Router = function(proxy, appName) {
  this._servers = {};
  this._proxy = proxy;
  this._streamMap = {};
  this._contextMap = {};
  this._appName = appName;
  proxy.addIncomingHandler(IncomingPayloadType.INVOKE_REQUEST, this);
  proxy.addIncomingHandler(IncomingPayloadType.LOOKUP_REQUEST, this);
  proxy.addIncomingHandler(IncomingPayloadType.AUTHORIZATION_REQUEST, this);
  proxy.addIncomingHandler(IncomingPayloadType.CANCEL, this);
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
  } catch (err) {

    // Gaurd against rejecting non-errors
    // TODO(jasoncampbell): consolidate all error conversion into verror
    if (! (err instanceof Error)) {
      var message;

      if (typeof err === 'undefined' || err === null) {
        message = 'Unknown exception.';
      } else {
        message = JSON.stringify(err);
      }

      return new Error(message);
    }

    return err;
  }
};

Router.prototype.handleRequest = function(messageId, type, request) {
  switch (type) {
    case IncomingPayloadType.INVOKE_REQUEST:
      this.handleRPCRequest(messageId, request);
      break;
    case IncomingPayloadType.LOOKUP_REQUEST:
      this.handleLookupRequest(messageId, request);
      break;
    case IncomingPayloadType.AUTHORIZATION_REQUEST:
      this.handleAuthorizationRequest(messageId, request);
      break;
    case IncomingPayloadType.CANCEL:
      this.handleCancel(messageId, request);
      break;
    default:
      vLog.Error('Unknown request type ' + type);
  }
};

Router.prototype.handleAuthorizationRequest = function(messageId, request) {
  var server = this._servers[request.serverID];
  if (!server) {
    var data = JSON.stringify({
      err: new vError.ExistsError('unknown server')
    });
    this._proxy.sendRequest(data, MessageType.AUTHORIZATION_RESPONSE,
        null, messageId);
    return;
  }
  var router = this;
  var securityContext = new SecurityContext(request.context, this._proxy);
  server.handleAuthorization(request.handle, securityContext).then(function() {
    router._proxy.sendRequest('{}', MessageType.AUTHORIZATION_RESPONSE, null,
        messageId);
  }).catch(function(e) {
    var data = JSON.stringify({
      err: ErrorConversion.toStandardErrorStruct(e, this._appName,
                                                 request.context.method)
    });
    router._proxy.sendRequest(data, MessageType.AUTHORIZATION_RESPONSE, null,
        messageId);
  });
};

Router.prototype.handleLookupRequest = function(messageId, request) {
  var server = this._servers[request.serverID];
  if (!server) {
    var data = JSON.stringify({
      err: new vError.ExistsError('unknown server')
    });
    this._proxy.sendRequest(data, MessageType.LOOKUP_RESPONSE,
        null, messageId);
    return;
  }

  var self = this;
  server._handleLookup(request.suffix, request.method).then(function(value) {
    var hasAuthorizer = (typeof value.authorizer === 'function');
    var label = value.service.labelForMethod(request.method);
    var data = {
      signature: IdlHelper.generateIdlWireDescription(value.service),
      hasAuthorizer: hasAuthorizer,
      handle: value._handle,
      label: label,
    };
    self._proxy.sendRequest(JSON.stringify(data), MessageType.LOOKUP_RESPONSE,
        null, messageId);
  }).catch(function(err) {
    var data = JSON.stringify({
      err: ErrorConversion.toStandardErrorStruct(err, self._appName,
                                                 request.method),
    });
    self._proxy.sendRequest(data, MessageType.LOOKUP_RESPONSE,
        null, messageId);
  });
};

/**
 * Handles cancellations of in-progress requests againsts Javascript service
 * invokations.
 * @param {string} messageId Message Id set by the server.
 */
Router.prototype.handleCancel = function(messageId) {
  var ctx = this._contextMap[messageId];
  if (ctx) {
    ctx.cancel();
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
Router.prototype.handleRPCRequest = function(messageId, request) {
  var err;
  var server = this._servers[request.serverId];
  if (!server) {
    err = new Error('Request for unknown server ' + request.serverId);
    this.sendResult(messageId, request.method, null, err);
    return;
  }

  var serviceWrapper = server.getServiceForHandle(request.handle);
  if (!serviceWrapper) {
    err = new Error('No service found');
    this.sendResult(messageId, request.method, null, err);
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
  try {
   args = DecodeUtil.tryDecode(args);
  } catch (e) {
    sendInvocationError(
      new vError.InternalError('Failed to decode args: ' + e));
    return;
  }

  var ctx = new ServerContext(request, this._proxy);
  this._contextMap[messageId] = ctx;

  // Create callback to pass to the function, if it is requested.
  var finished = false;
  var cb = function cb(e, v) {
    if (finished) {
      return;
    }
    finished = true;
    ctx.remoteBlessings.release();
    self.sendResult(messageId, request.method, v, e, metadata);
  };

  var injections = {
    $stream: new Stream(messageId, this._proxy.senderPromise, false),
    $cb: cb,
    $context: ctx,
    $suffix: ctx.suffix,
    $name: ctx.name,
    $remoteBlessings: ctx.remoteBlessings
  };

  var variables = inject(args, metadata.injections, injections);
  if (variables.indexOf('$stream') !== -1) {
    var stream = injections['$stream'];
    this._streamMap[messageId] = stream;
    var rpc = new StreamHandler(stream);
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

  if (variables.indexOf('$cb') !== -1) {
    // The callback takes care of sending the result, so we don't use the
    // promises.
    return;
  }

  // Send the result back to the server
  resultPromise.then(function(value) {
    if (finished) {
      return;
    }
    ctx.remoteBlessings.release();
    finished = true;
    self.sendResult(messageId, request.method, value,
        null, metadata);
  }, function(err) {
    if (finished) {
      return;
    }

    finished = true;

    // Gaurd against rejecting non-errors
    // TODO(jasoncampbell): consolidate all error conversion into verror
    if (! (err instanceof Error)) {
      var message;

      if (typeof err === 'undefined' || err === null) {
        message = 'Unknown exception.';
      } else {
        message = JSON.stringify(err);
      }

      err = new Error(message);
    }

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
    errorStruct = ErrorConversion.toStandardErrorStruct(err, this._appName,
                                                        name);
  }

  // Clean up the context map.
  var ctx = this._contextMap[messageId];
  if (ctx) {
    // Set an empty error handler to catch the now useless cancellation error
    // before we cancel the context.  This just prevents an annoying warning
    // from being printed.
    ctx.waitUntilDone().catch(function(err) {});
    ctx.cancel();
    delete this._contextMap[messageId];
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
 * @param {Veyron.Server} server The server who will handle the requests for
 * this name.
 * @param {function} [cb] If provided, the function will be called when
 * serve completes.  The first argument passed in is the error if there
 * was any.
 * @return {Promise} Promise to be called when serve completes or fails.
 */
Router.prototype.serve = function(name, server, cb) {
  vLog.info('Serving under the name: ', name);

  var messageJSON = {
    name: name,
    serverId: server.id,
  };

  this._servers[server.id] = server;

  var def = new Deferred(cb);
  var message = JSON.stringify(messageJSON);
  this._sendRequest(message, MessageType.SERVE, def);

  return def.promise;
};

/**
 * Sends an addName request to jspr.
 * @param {string} name Name to publish
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when operation completes or fails
 */
Router.prototype.addName = function(name, server, cb) {
  var messageJSON = {
    name: name,
    serverId: server.id,
  };

  var def = new Deferred(cb);
  var message = JSON.stringify(messageJSON);
  this._sendRequest(message, MessageType.ADD_NAME, def);

  return def.promise;
};

/**
 * Sends an removeName request to jspr.
 * @param {string} name Name to unpublish
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when operation completes or fails
 */
Router.prototype.removeName = function(name, server, cb) {
  var messageJSON = {
    name: name,
    serverId: server.id,
  };

  // Delete our bind cache entry for that name
  delete this._proxy.bindCache[name];

  var def = new Deferred(cb);
  var message = JSON.stringify(messageJSON);
  this._sendRequest(message, MessageType.REMOVE_NAME, def);

  return def.promise;
};

/**
 * Sends a stop server request to jspr.
 * @param {Server} server Server object to stop.
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when stop service completes or fails
 */
Router.prototype.stopServer = function(server, cb) {
  var self = this;

  var def = new Deferred(cb);
  this._sendRequest(server.id.toString(), MessageType.STOP, def);

  return def.promise.then(function(result) {
    delete self._servers[server.id];
    return result;
  });
};

/**
 * Sends a request to jspr.
 * @param {object} message Message to send.
 * @param {MessageType} type Type of message
 * @param {Deffered} def Deferred object
 */
Router.prototype._sendRequest = function(message, type, def) {
  var id = this._proxy.nextId();
  var handler = new SimpleHandler(def, this._proxy, id);
  this._proxy.sendRequest(message, type, handler, id);
};


module.exports = Router;
