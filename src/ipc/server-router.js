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
var verror = require('../errors/verror');
var SecurityContext = require('../security/context');
var ServerContext = require('./server-context');
var DecodeUtil = require('../lib/decode-util');
var EncodeUtil = require('../lib/encode-util');
var vom = require('../vom/vom');
var vdlsig =
    require('../v.io/core/veyron2/vdl/vdlroot/src/signature/signature');
var namespaceUtil = require('../namespace/util');
var naming = require('../v.io/core/veyron2/naming/naming');
var Glob = require('./glob');
var GlobStream = require('./glob-stream');
var VDLMountEntry = require('../v.io/core/veyron2/naming/naming').VDLMountEntry;
var ServerRPCReply =
  require('../v.io/wspr/veyron/services/wsprd/lib/lib').ServerRPCReply;

/**
 * A router that handles routing incoming requests to the right
 * server
 * @constructor
 * @private
 */
var Router = function(proxy, appName, rootCtx) {
  this._servers = {};
  this._proxy = proxy;
  this._streamMap = {};
  this._contextMap = {};
  this._appName = appName;
  this._rootCtx = rootCtx;
  this._outstandingRequestForId = {};
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
      // TODO(bjornick): Use the real context
      err: new verror.InternalError(this._rootCtx,
                                    ['Failed to decode ', e])
    });
    this._proxy.sendRequest(data, MessageType.AUTHORIZATION_RESPONSE,
        null, messageId);
  }
  var server = this._servers[request.serverID];
  if (!server) {
    var data = JSON.stringify({
      // TODO(bjornick): Use the real context
      err: new verror.ExistsError(this._rootCtx, ['unknown server'])
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
    // TODO(bjornick): Pass in context here so we can generate useful error
    // messages.
    var data = JSON.stringify({
      err: new verror.ExistsError(this._rootCtx, ['unknown server'])
    });
    this._proxy.sendRequest(data, MessageType.LOOKUP_RESPONSE,
        null, messageId);
    return;
  }

  var self = this;
  return server._handleLookup(request.suffix).then(function(value) {
    var signatureList = value.invoker.signature();
    var res;
    try {
      // TODO(alexfandrianto): Define []signature.Interface in VDL.
      // See dispatcher.go lookupReply's signature field.
      // Also see dispatcher.go lookupIntermediateReply's signature field.
      // We have to pre-encode the signature list into a string.
      var canonicalSignatureList = vom.Canonicalize.fill(signatureList, {
        kind: vom.Kind.LIST,
        elem: vdlsig.Interface.prototype._type
      });
      res = EncodeUtil.encode(canonicalSignatureList);
    } catch (e) {
      return Promise.reject(e);
    }

    var hasAuthorizer = (typeof value.authorizer === 'function');
    var hasGlobber = value.invoker.hasGlobber();
    var data = {
      handle: value._handle,
      signature: res,
      hasAuthorizer: hasAuthorizer,
      hasGlobber: hasGlobber
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
 *            // Note: This array contains wrapped arguments!
 * }
 */
Router.prototype.handleRPCRequest = function(messageId, vomRequest) {
  // TODO(bjornick): Break this method up into smaller methods.
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

  var self = this;
  var stream;
  var ctx = new ServerContext(request, this._proxy);
  if (request.method === 'Glob__') {
    if (!invoker.hasGlobber()) {
      err = new Error('Glob is not implemented');
      self.sendResult(messageId, 'Glob__', null, err);
      return;
    }
    stream = new Stream(messageId, this._proxy.senderPromise, false,
      VDLMountEntry.prototype._type);
    this._streamMap[messageId] = stream;
    this._contextMap[messageId] = ctx;
    this._outstandingRequestForId[messageId] = 0;
    this.incrementOutstandingRequestForId(messageId);
    var globPattern = vom.TypeUtil.unwrap(request.args[0]);
    this.handleGlobRequest(messageId, ctx.suffix,
                           server, new Glob(globPattern),  ctx, invoker,
                           completion);
    return;
  }

  function completion() {
    // There is no results to a glob method.  Everything is sent back
    // through the stream.
    self.sendResult(messageId, methodName, null, undefined, 1);
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
    err = new verror.NoExistError(
      ctx, ['Requested method', methodName, 'not found on']);
    this.sendResult(messageId, methodName, null, err);
    return;
  }

  // Unwrap the RPC arguments sent to the JS server.
  var unwrappedArgs = request.args.map(function(arg, i) {
    // If an any type was expected, unwrapping is not needed.
    if (methodSig.inArgs[i].type.kind === vom.Kind.ANY) {
      return arg;
    }
    return vom.TypeUtil.unwrap(arg);
  });
  var options = {
    methodName: methodName,
    args: unwrappedArgs,
    methodSig: methodSig,
    ctx: ctx,
  };

  this._contextMap[messageId] = options.ctx;
  if (methodIsStreaming(methodSig)) {
    stream = new Stream(messageId, this._proxy.senderPromise, false,
      methodSig.outStream.type);
    this._streamMap[messageId] = stream;
    var rpc = new StreamHandler(options.ctx, stream);
    this._proxy.addIncomingStreamHandler(messageId, rpc);
    options.stream = stream;
  }

  // Invoke the method;
  this.invokeMethod(invoker, options, function(err, results) {
    if (err) {
      var stackTrace;
      if (err instanceof Error && err.stack !== undefined) {
        stackTrace = err.stack;
      }
      vLog.debug('Requested method ' + methodName +
          ' threw an exception on invoke: ', err, stackTrace);

      // The error case has no results; only send the error.
      self.sendResult(messageId, methodName, undefined, err,
          methodSig.outArgs.length);
      return;
    }

    // Has results; associate the types of the outArgs.
    var canonResults = results.map(function(result, i) {
      return vom.Canonicalize.fill(result, methodSig.outArgs[i].type);
    });
    self.sendResult(messageId, methodName, canonResults, undefined,
                    methodSig.outArgs.length);
  });
};

function methodIsStreaming(methodSig) {
  return (typeof methodSig.inStream === 'object' &&
    methodSig.inStream !== null) || (typeof methodSig.outStream === 'object' &&
    methodSig.outStream !== null);
}

/**
 * Invokes a method with a methodSig
 */
Router.prototype.invokeMethod = function(invoker, options, cb) {
  var methodName = options.methodName;
  var args = options.args;
  var ctx = options.ctx;

  var injections = {
    context: ctx,
    stream: options.stream
  };

  function InvocationFinishedCallback(err, results) {
    ctx.remoteBlessings.release();
    cb(err, results);
  }

  invoker.invoke(methodName, args, injections, InvocationFinishedCallback);
};

Router.prototype.handleGlobRequest = function(messageId, name, server, glob,
                                              context, invoker, cb) {
  var self = this;
  var options;
  if (invoker.hasMethod('__glob')) {
    options = {
      methodName: '__glob',
      args: [glob.toString()],
      methodSig: { outArgs: [] },
      ctx: context,
      // For the glob__ method we just write the
      // results directly out to the rpc stream.
      stream: this._streamMap[messageId]
    };
    this.invokeMethod(invoker, options, function(err, results) {
      if (err) {
        vLog.info(name + '.__glob(' + glob + ') failed with ' + err);
      }
      self.decrementOutstandingRequestForId(messageId, cb);
    });
  } else if (invoker.hasMethod('__globChildren')) {
    if (glob.length() === 0) {
      // This means we match the current object.
      this._streamMap[messageId].write(new naming.VDLMountEntry({
        name: name}));
    }

    if (glob.finished()) {
      this.decrementOutstandingRequestForId(messageId, cb);
      return;
    }
    // Create a GlobStream
    var globStream = new GlobStream();
    options = {
      methodName: '__globChildren',
      args: [],
      methodSig: { outArgs: [] },
      ctx: context,
      stream: globStream
    };
    globStream.on('data', function(child) {
      // TODO(bjornick): Allow for escaped slashes.
      if (child.indexOf('/') !== -1) {
        vLog.error(name + '.__globChildren returned a bad child ' +  child);
        return;
      }

      var suffix = namespaceUtil.join(name, child);
      self.incrementOutstandingRequestForId(messageId);
      var ctx = new ServerContext(context);
      ctx.suffix = suffix;
      var nextInvoker;
      server._handleLookup(suffix).then(function(value) {
        nextInvoker = value.invoker;
        return server.handleAuthorization(value._handle, ctx);
      }).then(function() {
        var match = glob.matchInitialSegment(child);
        if (match.match) {
          self.handleGlobRequest(messageId, suffix, server, match.remainder,
                                 ctx, nextInvoker, cb);
        } else {
          self.decrementOutstandingRequestForId(messageId, cb);
        }
      }).catch(function(e) {
        self.decrementOutstandingRequestForId(messageId, cb);
        vLog.info('ipc Glob: client not authorized ' + suffix + ' : ' + e);
      });
    });

    this.invokeMethod(invoker, options, function(err, results) {
      if (err) {
        vLog.info('ipc Glob: ' + name + '.__globChildren failed with ' + err);
      }
      self.decrementOutstandingRequestForId(messageId, cb);
    });
  } else {
    // This is a leaf of the globChildren call so we return this as
    // a result.
    this._streamMap[messageId].write(new naming.VDLMountEntry({
      name: name}));

    this.decrementOutstandingRequestForId(messageId, cb);
  }
};

Router.prototype.incrementOutstandingRequestForId = function(id) {
  this._outstandingRequestForId[id]++;
};

Router.prototype.decrementOutstandingRequestForId = function(id, cb) {
  this._outstandingRequestForId[id]--;
  if (this._outstandingRequestForId[id] === 0) {
    cb();
    delete this._outstandingRequestForId[id];
  }
};

/**
 * Sends the result of a requested invocation back to jspr
 * @private
 * @param {string} messageId Message id of the original invocation request
 * @param {string} name Name of method
 * @param {Object} results Result of the call
 * @param {Object} err Error from the call
 */
Router.prototype.sendResult = function(messageId, name, results, err,
  numOutArgs) {
  if (!results) {
    results = new Array(numOutArgs);
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
  if (stream && typeof stream.serverClose === 'function') {
    // We should probably remove the stream from the dictionary, but it's
    // not clear if there is still a reference being held elsewhere.  If there
    // isn't, then GC might prevent this final message from being sent out.
    stream.serverClose(results, errorStruct);
    this._proxy.dequeue(messageId);
  } else {
    var responseData = new ServerRPCReply({
      results: results,
      err: errorStruct
    });
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
  this._sendRequest(this._rootCtx, message, MessageType.SERVE, def);

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
  this._sendRequest(this._rootCtx, message, MessageType.ADD_NAME, def);

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
  this._proxy.signatureCache.del(name);

  var def = new Deferred(cb);
  var message = JSON.stringify(messageJSON);
  this._sendRequest(this._rootCtx, message, MessageType.REMOVE_NAME,
                    def);

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
  this._sendRequest(this._rootCtx, server.id.toString(),
                    MessageType.STOP, def);

  return def.promise.then(function(result) {
    delete self._servers[server.id];
    return result;
  });
};

/**
 * Sends a request to jspr.
 * @private
 * @param {Context} ctx The context for this message.
 * @param {object} message Message to send.
 * @param {MessageType} type Type of message
 * @param {Deffered} def Deferred object
 */
Router.prototype._sendRequest = function(ctx, message, type, def) {
  var id = this._proxy.nextId();
  var handler = new SimpleHandler(ctx, def, this._proxy, id);
  this._proxy.sendRequest(message, type, handler, id);
};


module.exports = Router;
