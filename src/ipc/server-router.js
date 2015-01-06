/**
 * @fileoveriew A router that handles incoming server rpcs.
 * @private
 */

var Promise = require('../lib/promise');
var Stream = require('../proxy/stream');
var MessageType = require('../proxy/message-type');
var IncomingPayloadType = require('../proxy/incoming-payload-type');
var ErrorConversion = require('../proxy/error-conversion');
var Deferred = require('./../lib/deferred');
var vLog = require('./../lib/vlog');
var SimpleHandler = require('../proxy/simple-handler');
var StreamHandler = require('../proxy/stream-handler');
var verror = require('../lib/verror');
var SecurityContext = require('../security/context');
var ServerContext = require('./server-context');
var DecodeUtil = require('../lib/decode-util');
var EncodeUtil = require('../lib/encode-util');
var vom = require('vom')
;
/**
 * A router that handles routing incoming requests to the right
 * server
 * @constructor
 * @private
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
  try {
   request = DecodeUtil.decode(request);
  } catch (e) {
    JSON.stringify({
      err: new verror.InternalError('Failed to decode ' + e)
    });
    this._proxy.sendRequest(data, MessageType.AUTHORIZATION_RESPONSE,
        null, messageId);
  }
  var server = this._servers[request.serverID];
  if (!server) {
    var data = JSON.stringify({
      err: new verror.ExistsError('unknown server')
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
      err: new verror.ExistsError('unknown server')
    });
    this._proxy.sendRequest(data, MessageType.LOOKUP_RESPONSE,
        null, messageId);
    return;
  }

  var self = this;
  return server._handleLookup(request.suffix).then(function(value) {
    // TODO(bprosnitz) Support multiple signatures.
    var signatureList = value.invoker.signature();
    var res;
    try {
      res = EncodeUtil.encode(signatureList);
    } catch (e) {
      return Promise.reject(e);
    }

    var hasAuthorizer = (typeof value.authorizer === 'function');
    var data = {
      handle: value._handle,
      signature: res,
      hasAuthorizer: hasAuthorizer
    };
    self._proxy.sendRequest(JSON.stringify(data), MessageType.LOOKUP_RESPONSE,
        null, messageId);
  }).catch(function(err) {
    var data = JSON.stringify({
      err: ErrorConversion.toStandardErrorStruct(err, self._appName,
                                                 '__Signature'),
    });
    self._proxy.sendRequest(data, MessageType.LOOKUP_RESPONSE,
        null, messageId);
  });
};

/**
 * Handles cancellations of in-progress requests againsts Javascript service
 * invokations.
 * @private
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
 * @private
 * @param {string} messageId Message Id set by the server.
 * @param {Object} vomRequest VOM encoded request. Request's structure is
 * {
 *   serverId: number // the server id
 *   method: string // Name of the method on the service to call
 *   args: [] // Array of positional arguments to be passed into the method
 * }
 */
Router.prototype.handleRPCRequest = function(messageId, vomRequest) {
  var err;
  var request;
  try {
   request = DecodeUtil.decode(vomRequest);
  } catch (e) {
    err = new Error('Failed to decode args: ' + e);
    this.sendResult(messageId, '', null, err);
    return;
  }
  var methodName = vom.MiscUtil.capitalize(request.method);

  var server = this._servers[request.serverId];

  if (!server) {
    // TODO(bprosnitz) What error type should this be.
    err = new Error('Request for unknown server ' + request.serverId);
    this.sendResult(messageId, methodName, null, err);
    return;
  }

  var invoker = server.getInvokerForHandle(request.handle);
  if (!invoker) {
    console.error('No invoker found: ', request);
    err = new Error('No service found');
    this.sendResult(messageId, methodName, null, err);
    return;
  }

  // Find the method signature.
  var signature = invoker.signature();
  var methodSig;
  signature.forEach(function(ifaceSig) {
    ifaceSig.methods.forEach(function(method) {
      if (method.name === methodName) {
        methodSig = method;
      }
    });
  });
  if (methodSig === undefined) {
    err = new verror.NoExistError('Requested method ' + methodName +
        ' not found on');
    this.sendResult(messageId, methodName, null, err);
    return;
  }

  var self = this;
  var sendInvocationError = function(e, numOutArgs) {
    var stackTrace;
    if (e instanceof Error && e.stack !== undefined) {
      stackTrace = e.stack;
    }
    vLog.debug('Requested method ' + methodName +
        ' threw an exception on invoke: ', e, stackTrace);
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
    self.sendResult(messageId, methodName, result, e,
        numOutArgs);
  };
  var args = request.args;

  var ctx = new ServerContext(request, this._proxy);
  this._contextMap[messageId] = ctx;

  var injections = {
    '$context': ctx,
    '$suffix': ctx.suffix,
    '$name': ctx.name,
    '$remoteBlessings': ctx.remoteBlessings
  };

  if ((typeof methodSig.inStream === 'object' &&
    methodSig.inStream !== null) || (typeof methodSig.outStream === 'object' &&
    methodSig.outStream !== null)) {
    var stream = new Stream(messageId, this._proxy.senderPromise, false);
    this._streamMap[messageId] = stream;
    var rpc = new StreamHandler(stream);
    this._proxy.addIncomingStreamHandler(messageId, rpc);
    injections['$stream'] = stream;
  }

  function InvocationFinishedCallback(err, result) {
    ctx.remoteBlessings.release();

    if (err) {
      sendInvocationError(err, methodSig.outArgs.length);
      return;
    }

    self.sendResult(messageId, methodName, result, undefined,
      methodSig.outArgs.length);
  }

  invoker.invoke(methodName, args, injections, InvocationFinishedCallback);
};

/**
 * Sends the result of a requested invocation back to jspr
 * @private
 * @param {string} messageId Message id of the original invocation request
 * @param {string} name Name of method
 * @param {Object} value Result of the call
 * @param {Object} err Error from the call
 */
Router.prototype.sendResult = function(messageId, name, value, err,
  numOutArgs) {
  var results = [];
  if (numOutArgs !== undefined) {
    // The err outArg is handled separately from value outArgs.
    var numArgsWithoutErr = numOutArgs - 1;
    switch (numArgsWithoutErr) {
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
          if (value.length !== numArgsWithoutErr) {
            vLog.error('Wrong number of arguments returned by ' + name +
                '. expected: ' + numArgsWithoutErr + ', got:' +
                value.length);
          }
          results = value;
        } else {
          vLog.error('Wrong number of arguments returned by ' + name +
              '. expected: ' + numArgsWithoutErr+ ', got: 1');
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

    var responseDataVOM = EncodeUtil.encode(responseData);
    this._proxy.sendRequest(responseDataVOM, MessageType.RESPONSE, null,
        messageId);
  }
};

/**
 * Serves the server under the given name
 * @private
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
 * @private
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
 * @private
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
 * @private
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
 * @private
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
