// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 *  @fileoverview Client for the vanadium service.
 *
 *  Usage:
 *  var cl = new client(proxyConnection);
 *  var service = cl.bindTo('EndpointAddress', 'ServiceName');
 *  resultPromise = service.MethodName(arg);
 *  @private
 */

var actions = require('../verror/actions');
var byteUtil = require('../vdl/byte-util');
var Controller =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/app').Controller;
var context = require('../context');
var Deferred = require('../lib/deferred');
var emitStreamError = require('../lib/emit-stream-error');
var Incoming = require('../proxy/message-type').Incoming;
var makeError = require('../verror/make-errors');
var Outgoing = require('../proxy/message-type').Outgoing;
var Promise = require('../lib/promise');
var ReservedSignature =
  require('../gen-vdl/v.io/v23/rpc').ReservedSignature.val;
var RpcCallOption =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/app').RpcCallOption;
var RpcRequest =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/app').RpcRequest;
var Stream = require('../proxy/stream');
var time = require('../gen-vdl/v.io/v23/vdlroot/time');
var uncapitalize = require('../vdl/util').uncapitalize;
var unwrap = require('../vdl/type-util').unwrap;
var vdl = require('../vdl');
var verror = require('../gen-vdl/v.io/v23/verror');
var vlog = require('../lib/vlog');
var SharedContextKeys = require('../runtime/shared-context-keys');
var vtrace = require('../vtrace');
var Blessings = require('../security/blessings');
var BlessingsId =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/principal').BlessingsId;
var ByteStreamMessageReader = require('../vom/byte-stream-message-reader');
var ByteStreamMessageWriter = require('../vom/byte-stream-message-writer');
var Encoder = require('../vom/encoder');
var Decoder = require('../vom/decoder');
var TaskSequence = require('../lib/task-sequence');
var runtimeFromContext = require('../runtime/runtime-from-context');
var vom = require('../vom');

var OutstandingRPC = function(ctx, options, cb) {
  this._ctx = ctx;
  this._controller = ctx.value(SharedContextKeys.RUNTIME)._controller;
  this._proxy = options.proxy;
  this._id = -1;
  this._name = options.name;
  this._methodName = options.methodName,
  this._args = options.args;
  this._outArgTypes = options.outArgTypes;
  this._numOutParams = options.numOutParams;
  this._isStreaming = options.isStreaming || false;
  this._inStreamingType = options.inStreamingType;
  this._outStreamingType = options.outStreamingType;
  this._callOptions = options.callOptions;
  this._cb = cb;
  this._encoder = options.encoder;
  this._decoder = options.decoder;
  this._def = null;
  this._tasks = new TaskSequence();
};

// Helper function to convert an out argument to the given type.
function convertOutArg(ctx, arg, type, controller) {
  if (arg instanceof BlessingsId) {
    var runtime = runtimeFromContext(ctx);
    return runtime.blessingsManager.blessingsFromId(arg)
    .then(function(blessings) {
      if (blessings) {
        blessings.retain();
      }
      return blessings;
    });
  }

  // There's no protection against bad out args if it's a JSValue.
  // Otherwise, convert to the out arg type to ensure type correctness.
  if (!type.equals(vdl.types.JSVALUE)) {
    try {
      return Promise.resolve(unwrap(vdl.canonicalize.reduce(arg, type)));
    } catch(err) {
      return Promise.reject(err);
    }
  }

  return Promise.resolve(unwrap(arg));
}

OutstandingRPC.prototype.start = function() {
  this._id = this._proxy.nextId();
  var ctx = this._ctx;
  var self = this;

  var cb;
  var outArgTypes = this._outArgTypes;

  if (this._cb) {
    // Wrap the callback to call with multiple arguments cb(err, a, b, c)
    // rather than cb(err, [a, b, c]).
    var origCb = this._cb;
    cb = function convertToMultiArgs(err, results) { // jshint ignore:line
      // If called from a deferred, the results are undefined.

      if (err) {
        origCb(err);
        return;
      }

      // Each out argument should also be unwrapped. (results was []any)
      results = results || [];
      var resultPromises = results.map(function(res, i) {
        return convertOutArg(ctx, res, outArgTypes[i], self._controller);
      });
      Promise.all(resultPromises)
      .then(function(results) {
        results.unshift(null);
        origCb.apply(null, results);
      }).catch(origCb);
    };
  }

  var def = new Deferred(cb);

  if (!this._cb) {
    // If we are using a promise, strip single args out of the arg array.
    // e.g. [ arg1 ] -> arg1
    def.promise = def.promise.then(function(args) {
      if (!Array.isArray(args)) {
        throw new verror.InternalError(ctx,
          'Internal error: incorrectly formatted out args in client');
      }


      // Each out argument should also be unwrapped. (args was []any)
      var unwrappedArgPromises = args.map(function(outArg, i) {
        return convertOutArg(ctx, outArg, outArgTypes[i], self._controller);
      });

      return Promise.all(unwrappedArgPromises).then(function(unwrappedArgs) {
        // We expect:
        // 0 args - return; // NOT return [];
        // 1 args - return a; // NOT return [a];
        // 2 args - return [a, b] ;
        //
        // Convert the results from array style to the expected return style.
        // undefined, a, [a, b], [a, b, c] etc
        switch(unwrappedArgs.length) {
          case 0:
            return undefined;
          case 1:
            return unwrappedArgs[0];
          default:
            return unwrappedArgs;
        }
      });
    });
  }

  var streamingDeferred = null;
  if (this._isStreaming) {
    streamingDeferred = new Deferred();
    // Clients read data of type outStreamingType and write data of type
    // inStreamingType.
    def.stream = new Stream(this._id, streamingDeferred.promise, true,
      this._outStreamingType, this._inStreamingType);
    def.promise.stream = def.stream;
  }

  var message = this.constructMessage();

  this._def = def;
  this._proxy.cancelFromContext(this._ctx, this._id);
  this._proxy.sendRequest(message, Outgoing.REQUEST, this, this._id);
  if (streamingDeferred) {
    this._proxy.senderPromise.then(function(ws) {
      streamingDeferred.resolve(ws);
    }, function(err) {
      streamingDeferred.reject(err);
    });
  }

  return def.promise;
};

OutstandingRPC.prototype.handleResponse = function(type, data) {
  var rpc = this;
  switch (type) {
    case Incoming.FINAL_RESPONSE:
      this._tasks.addTask(function() {
        return rpc.handleCompletion(data);
      });
      break;
    case Incoming.STREAM_RESPONSE:
      this._tasks.addTask(function() {
        return rpc.handleStreamData(data);
      });
      break;
    case Incoming.ERROR_RESPONSE:
      this._tasks.addTask(function() {
        return rpc.handleError(data);
      });
      break;
    case Incoming.STREAM_CLOSE:
      this._tasks.addTask(function() {
        return rpc.handleStreamClose();
      });
      break;
    default:
      this._tasks.addTask(function() {
        return rpc.handleError(
            new verror.InternalError(
              rpc._ctx, 'Received unknown response type from wspr'));
      });
      break;
  }
};

OutstandingRPC.prototype.handleCompletion = function(data) {
  try {
    var bytes = byteUtil.hex2Bytes(data);
    this._decoder._messageReader.addBytes(bytes);
  } catch (e) {
    this.handleError(
      new verror.InternalError(this._ctx, 'Failed to decode result: ', e));
      return Promise.resolve();
  }
  var rpc = this;
  return this._decoder.decode().then(function(response) {
    vtrace.getStore(rpc._ctx).merge(response.traceResponse);
    vtrace.getSpan(rpc._ctx).finish();

    rpc._def.resolve(response.outArgs);
    if (rpc._def.stream) {
      rpc._def.stream._queueClose();
    }
    rpc._proxy.dequeue(this._id);
  }).catch(function(e) {
    rpc.handleError(
      new verror.InternalError(rpc._ctx, 'Failed to decode result: ', e));
    return;
  });
};

OutstandingRPC.prototype.handleStreamData = function(data) {
  if (!this._def.stream) {
    vlog.logger.warn('Ignoring streaming message for non-streaming flow : ' +
        this._id);
    return Promise.resolve();
  }
  try {
    data = byteUtil.hex2Bytes(data);
  } catch (e) {
    this.handleError(
      new verror.InternalError(this._ctx, 'Failed to decode result: ', e));
      return;
  }
  var rpc = this;
  return vom.decode(data).then(function(data) {
    rpc._def.stream._queueRead(data);
  }).catch(function(e) {
    rpc.handleError(
      new verror.InternalError(rpc._ctx, 'Failed to decode result: ', e));
  });
};

OutstandingRPC.prototype.handleStreamClose = function() {
  if (this._def.stream) {
    this._def.stream._queueClose();
  }
  return Promise.resolve();
};

OutstandingRPC.prototype.handleError = function(err) {
  if (this._def.stream) {
    emitStreamError(this._def.stream, err);
    this._def.stream._queueClose();
  }
  this._def.reject(err);
  this._proxy.dequeue(this._id);
  return Promise.resolve();
};


/**
 * Construct a message to send to the vanadium native code
 * @private
 * @return {string} json string to send to jspr
 */
OutstandingRPC.prototype.constructMessage = function() {
  var deadline = this._ctx.deadline();
  var timeout = new time.WireDeadline();
  if (deadline !== null) {
    var millis = deadline - Date.now();
    var seconds = Math.floor(millis / 1000);
    timeout.fromNow = new time.Duration({
      seconds: seconds,
      nanos: (millis - seconds * 1000) * 1000000
    });
  } else {
    timeout.noDeadline = true;
  }

  var language = this._ctx.value(SharedContextKeys.LANG_KEY) || '';
  var jsonMessage = {
    name: this._name,
    method: this._methodName,
    numInArgs: this._args.length,
    // TODO(bprosnitz) Is || 0 needed?
    numOutArgs: this._numOutParams || 0,
    isStreaming: this._isStreaming,
    traceRequest: vtrace.request(this._ctx),
    deadline: timeout,
    callOptions: this._callOptions,
    context: {
      language: language,
    }
  };

  var header = new RpcRequest(jsonMessage);
  var encoder = this._encoder;
  if (!encoder._messageWriter) {
    encoder._messageWriter = new ByteStreamMessageWriter();
  }
  encoder.encode(header);
  for (var i = 0; i < this._args.length; i++) {
    var o = this._args[i];
    if (o instanceof Blessings) {
      o = o.convertToJsBlessings();
    }
    encoder.encode(o);
  }
  return byteUtil.bytes2Hex(encoder._messageWriter.consumeBytes());
};

/**
 * @summary Client represents the interface for making RPC calls.
 * There may be multiple outstanding Calls associated with a single Client.
 *
 * @description
 * <p>Private Constructor, use
 * [Runtime#newClient]{@link module:vanadium~Runtime#newClient}</p>
 * @inner
 * @constructor
 * @memberof module:vanadium.rpc
 */
function Client(proxyConnection) {
  if (!(this instanceof Client)) {
    return new Client(proxyConnection);
  }

  this._proxyConnection = proxyConnection;
  if (proxyConnection && proxyConnection.clientEncoder) {
    this._encoder = proxyConnection.clientEncoder;
  }
  if (proxyConnection && proxyConnection.clientDecoder) {
    this._decoder = proxyConnection.clientDecoder;
  }
  this._controller = this.bindWithSignature(
    '__controller', [Controller.prototype._serviceDescription]);
}

// TODO(bprosnitz) v.io/core/javascript.IncorrectArgCount.
var IncorrectArgCount = makeError(
  'v.io/core/javascript.IncorrectArgCount',
  actions.NO_RETRY,
  '{1:}{2:} Client RPC call {3}({4}) had an incorrect number of ' +
  'arguments. Expected format: {5}({6})');

/**
 * A callback that is called when
 * [bindTo]{@link module:vanadium.rpc~Client#bindTo} finishes.
 * @callback module:vanadium.rpc~Client~bindToCb
 * @param {Error} err If set the error that occurred.
 * @param {object} service The stub object containing the exported
 * methods of the remote service.
 */
/**
 * <p>Performs client side binding of a remote service to a native JavaScript
 * stub object.</p>
 *
 * Usage:
 * <pre>
 * client.bindTo(context, 'Service/Name').then(function(service) {
 *    service.fooMethod(fooArgs).then(function(methodCallResult) {
 *      // Do stuff with results.
 *    }).catch(function(err) {
 *       // Calling fooMethod failed.
 *     });
 * }).catch(function(err) {
 *     // Binding to Service/Name failed.
 * });
 * </pre>
 * @param {module:vanadium.context.Context} ctx A context.
 * @param {string} name The vanadium name of the service to bind to.
 * @param {module:vanadium.rpc~Client~bindToCb} [cb] If given, this function
 * will be called on completion of the bind.
 * @return {Promise<object>} Promise that resolves to the stub object containing
 * the exported methods of the remote service.
 */
Client.prototype.bindTo = function(ctx, name, cb) {
  var client = this;
  var last = arguments.length - 1;

  // grab the callback
  if (typeof arguments[last] === 'function') {
    cb = arguments[last];
  }

  var def = new Deferred(cb);

  // Require first arg to be a Context
  if (! (ctx instanceof context.Context)) {
    var err = new Error('First argument must be a Context object.');

    def.reject(err);

    return def.promise;
  }

  client.signature(ctx, name).then(function(serviceSignature) {
    vlog.logger.debug('Received signature for:', name, serviceSignature);
    def.resolve(client.bindWithSignature(name, serviceSignature));
  }).catch(function(err) {
    def.reject(err);
  });

  return def.promise;
};

/**
 * <p>Performs client side binding of a remote service to a native JavaScript
 * stub object when you already have the service signature.</p>
 *
 * Usage:
 * <pre>
 * var service = client.bindWithSignature('Service/Name', signature);
 * service.fooMethod(fooArgs).then(function(methodCallResult) {
 *   // Do stuff with results.
 * }).catch(function(err) {
 *   // Calling fooMethod failed.
 * });
 * </pre>
 *
 * @param {string} name The vanadium name of the service to bind to.
 * @param {module:vanadium.vdl.signature.Interface} signature The service
 * signature of a vanadium service.
 * @return {object} The stub object containing
 * the exported methods of the remote service.
 */
Client.prototype.bindWithSignature = function(name, signature) {
  var client = this;
  var boundObject = {};

  function bindMethod(methodSig) {
    var method = uncapitalize(methodSig.name);

    boundObject[method] = function(ctx /*, arg1, arg2, ..., callback*/) {
      var args = Array.prototype.slice.call(arguments, 0);
      var callback;
      var err;

      // Callback is the last function argument, pull it out of the args
      var lastType = typeof args[args.length - 1];
      if (lastType === 'function' || lastType === 'undefined') {
        callback = args.pop();
      }

      // Require first arg to be a Context
      if (args.length >= 1 && args[0] instanceof context.Context) {
        ctx = args.shift();
      } else {
        err = new Error('First argument must be a Context object.');

        if (callback) {
          return callback(err);
        } else {
          return Promise.reject(err);
        }
      }

      // Remove ClientCallOptions from args and build array of callOptions.
      var callOptions = [];
      args = args.filter(function(arg) {
        if (arg instanceof ClientCallOption) {
          callOptions = callOptions.concat(
            arg._toRpcCallOption(ctx, client._proxyConnection));
          return false;
        }
        return true;
      });

      ctx = vtrace.withNewSpan(ctx, '<jsclient>"'+name+'".'+method);

      if (args.length !== methodSig.inArgs.length) {
        var expectedArgs = methodSig.inArgs.map(function(arg) {
          return arg.name;
        });

        // TODO(jasoncampbell): Create an constructor for this error so it
        // can be created with less ceremony and checked in a
        // programatic way:
        //
        //     service
        //     .foo('bar')
        //     .catch(ArgumentsArityError, function(err) {
        //       console.error('invalid number of arguments')
        //     })
        //

        // The given arguments exclude the ctx and (optional) cb.
        var givenArgs = Array.prototype.slice.call(arguments, 1);
        if (typeof givenArgs[givenArgs.length - 1] === 'function') {
          givenArgs.pop();
        }
        err = new IncorrectArgCount(
          ctx,
          methodSig.name,
          givenArgs,
          methodSig.name,
          expectedArgs
        );
        if (callback) {
          return callback(err);
        } else {
          return Promise.reject(err);
        }
      }

      // The inArgs need to be converted to the signature's inArg types.
      var canonArgs = new Array(args.length);
      try {
        for (var i = 0; i < args.length; i++) {
          canonArgs[i] = vdl.canonicalize.fill(args[i],
                                               methodSig.inArgs[i].type);

        }
      } catch(err) {
        vlog.logger.error('rpc failed - invalid arg(s)', err);
        if (callback) {
          return callback(err);
        } else {
          return Promise.reject(err);
        }
      }

      // The OutstandingRPC needs to know streaming information.
      var inStreaming = (typeof methodSig.inStream === 'object'  &&
                         methodSig.inStream !== null);
      var outStreaming = (typeof methodSig.outStream === 'object' &&
                          methodSig.outStream !== null);
      var isStreaming = inStreaming || outStreaming;

      // The OutstandingRPC needs to know the out arg types.
      var outArgTypes = methodSig.outArgs.map(function(outArg) {
        return outArg.type;
      });

      var rpc = new OutstandingRPC(ctx, {
        proxy: client._proxyConnection,
        name: name,
        methodName: methodSig.name,
        args: canonArgs,
        outArgTypes: outArgTypes,
        numOutParams: methodSig.outArgs.length,
        isStreaming: isStreaming,
        inStreamingType: inStreaming ? methodSig.inStream.type : null,
        outStreamingType: outStreaming ? methodSig.outStream.type : null,
        callOptions: callOptions,
        // If there isn't an encoder or decoder cached, we just use a new one.
        // This only really happens in unit tests.
        encoder: client._encoder || new Encoder(),
        decoder: client._decoder || new Decoder(new ByteStreamMessageReader()),
      }, callback);

      return rpc.start();
    };
  }

  // Setup the bindings to every method in the service signature list.
  signature.forEach(function(sig) {
    sig.methods.forEach(function(meth) {
      bindMethod(meth);
    });
  });

  Object.defineProperty(boundObject, '__signature', {
    value: signature,
    writable: false,
  });

  return boundObject;
};

/**
 * A callback that is called with either signature interfaces or an error.
 * @callback module:vanadium.rpc~Client~signatureCb
 * @param {Error} err If set, the error that occurred.
 * @param {module:vanadium.vdl.signature.Interface[]} signature The signature
 * interfaces.
 */
/**
 * Returns the object signatures for a given object name.
 * @param {module:vanadium.context.Context} ctx A context.
 * @param {string} name The vanadium name of the service to bind to.
 * @param {module:vanadium.rpc~Client~signatureCb} [cb] If given, this
 * function will be called on completion.
 * @return {Promise<module:vanadium.vdl.signature.Interface[]>} Promise that
 * will be resolved with the signature interfaces or rejected with an error
 * if there is one.
 */
Client.prototype.signature = function(ctx, name, cb) {
  var last = arguments.length - 1;

  // grab the callback
  if (typeof arguments[last] === 'function') {
    cb = arguments[last];
  }
  var deferred = new Deferred(cb);

  if (!(ctx instanceof context.Context)) {
    deferred.reject(new Error('First argument must be a Context object.'));
    return deferred.promise;
  }

  var cache = this._proxyConnection.signatureCache;
  var cacheEntry = cache.get(name);
  if (cacheEntry) {
    deferred.resolve(cacheEntry);
    return deferred.promise;
  }
  this._controller.signature(ctx, name).then(function(signature){
    cache.set(name, signature);
    deferred.resolve(signature);
  }).catch(function(err) {
    deferred.reject(err);
  });

  return deferred.promise;
};

/**
 * A callback that will be called on completion of the
 * [remoteBlessings]{@link module:vanadium.rpc~Client#remoteBlessings}
 * function.
 * @callback module:vanadium.rpc~Client~remoteBlessingsCb
 * @param {Error} err If set, the error that occurred.
 * @param {string[]} blessingNames The blessings of the remote server.
 */
/**
 * Returns the remote blessings of a server at the given name.
 * @param {module:vanadium.context.Context} ctx A context.
 * @param {string} name The vanadium name of the service to get the remote
 * blessings of.
 * @param {string} [method] The name of the rpc method that will be started in
 * order to read the blessings.  Defaults to 'Signature'.  This only matters in
 * the case when a server responds to different method calls with different
 * blessings.
 * @param {module:vanadium.rpc~Client~remoteBlessingsCb} [cb] If given, this
 * function will be called on completion.
 * @return {Promise<string[]>} Promise that will be resolved with the
 * blessing names or rejected with an error if there is one.
 */
Client.prototype.remoteBlessings = function(ctx, name, method, cb) {
  var last = arguments.length - 1;

  // grab the callback
  if (typeof arguments[last] === 'function') {
    cb = arguments[last];
  }

  // method defaults to Signature.
  if (typeof method !== 'string') {
    method = ReservedSignature;
  }

  return this._controller.remoteBlessings(ctx, name, method, cb);
};

/**
 * @summary Create a ClientCallOption object.
 *
 * @description <p>Client call options can be passed to a service method and
 * are used to configure the RPC call.  They are not passed to the Vanadium RPC
 * service.</p>
 *
 * <p>Supported keys are 'allowedServersPolicy' and 'granter'.</p>
 *
 * <p>Example of allowedServersPolicy option:</p>
 * <pre>
 * var callOpt = client.callOption({
 *   allowedServersPolicy: ['alice/home/tv']
 * });
 * service.get(ctx, 'foo', callOpt, function(err) {
 *   // err will be non-null if service's blessings do not match
 *   // ['alice/home/tv'].
 * });
 * </pre>
 *
 * <p>Example of granter option:</p>
 * <pre>
 * var ctx = runtime.getContext();
 * var granter = function(ctx, call, callback) {
 *   // Bless the server's public key with the extension 'ext' and 5 second
 *   // expiration caveat.
 *   var expCaveat = caveats.createExpiryCaveat(new Date(Date.now() + 5000));
 *   runtime.principal.bless(ctx, call.remoteBlessings.publicKey,
 *       call.localBlessings, 'ext', expCaveat, callback);
 * };
 *
 * var callOpt = client.callOption({
 *   granter: granter
 * });
 *
 * // Make a call on to the service.  Server will be granted blessing.
 * service.get(ctx, 'foo', callOpt, cb);
 * </pre>
 * @param {object} opts Map of call options.
 * @param {string[]} opts.allowedServersPolicy <p>Array of blessing patterns
 * that the allowed server must match in order for the RPC to be initiated.</p>
 * @param {module:vanadium.security~GranterFunction} opts.granter <p>A granter
 * function.</p>
 * @return {module:vanadium.rpc~Client~ClientCallOption}
 */
Client.prototype.callOption = function(opts) {
  // TODO(nlacasse): Support other CallOption types.
  var allowedOptions = ['allowedServersPolicy', 'granter'];

  // Validate opts.
  var keys = Object.keys(opts);
  keys.forEach(function(key) {
    if (allowedOptions.indexOf(key) < 0) {
      throw new verror.BadArgError(null, 'Invalid call option ' + key);
    }
  });

  return new ClientCallOption(opts);
};

/**
 * @summary ClientCallOption represents different configurations that can be
 * specified when making an RPC call.
 * @description
 * Private constructor, use
 * [client.callOption(opts)]{@link module:vanadium.rpc~Client#callOption}
 * to construct an instance.
 * @constructor
 * @inner
 * @memberof module:vanadium.rpc~Client
 */
function ClientCallOption(opts) {
  this.opts = opts;
}

/**
 * Convert ClientCallOption object to array of RpcCallOption VDL values.
 * @private
 * @return {Array} Array of RpcCallOption VDL values.
 */
ClientCallOption.prototype._toRpcCallOption = function(ctx, proxy) {
  var rpcCallOptions = [];
  var keys = Object.keys(this.opts);
  keys.forEach(function(key) {
    var opt = {};
    if (key === 'granter') {
      var runtime = ctx.value(SharedContextKeys.RUNTIME);
      var granterRouter = runtime._getGranterRouter();
      var fn = this.opts[key];
      var granterId = granterRouter.addGranter(fn);
      opt[key] = granterId;
    } else {
      opt[key] = this.opts[key];
    }
    rpcCallOptions.push(new RpcCallOption(opt));
  }, this);
  return rpcCallOptions;
};

/**
 * Export the module
 */
module.exports = Client;
