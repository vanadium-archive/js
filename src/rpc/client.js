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
var ByteArrayMessageWriter = require('../vom/byte-array-message-writer');
var byteUtil = require('../vdl/byte-util');
var Controller =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/app').Controller;
var context = require('../runtime/context');
var Deferred = require('../lib/deferred');
var emitStreamError = require('../lib/emit-stream-error');
var Encoder = require('../vom/encoder');
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
var vom = require('../vom');
var vtrace = require('../vtrace');
var Blessings = require('../security/blessings');
var JsBlessings =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/principal').JsBlessings;
var SharedContextKeys = require('../runtime/shared-context-keys');


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
  this._def = null;
};

// Helper function to convert an out argument to the given type.
function convertOutArg(arg, type, controller) {
  var canonOutArg = arg;
  var unwrappedArg = unwrap(arg);
  if (unwrappedArg instanceof JsBlessings) {
    var res =
      new Blessings(unwrappedArg.handle, unwrappedArg.publicKey, controller);
    res.retain();
    return res;
  }

  // There's no protection against bad out args if it's a JSValue.
  // Otherwise, convert to the out arg type to ensure type correctness.
  if (!type.equals(vdl.Types.JSVALUE)) {
    canonOutArg = vdl.Canonicalize.reduce(arg, type);
  }

  return unwrap(canonOutArg);
}

// Helper function to safely convert an out argument.
// The returned error, if any is useful for a callback.
function convertOutArgSafe(arg, type) {
  try {
    return [undefined, convertOutArg(arg, type)];
  } catch(err) {
    return [err, undefined];
  }
}

OutstandingRPC.prototype.start = function() {
  this._id = this._proxy.nextId();
  var self = this;

  var cb;
  var outArgTypes = this._outArgTypes;

  if (this._cb) {
    // Wrap the callback to call with multiple arguments cb(err, a, b, c)
    // rather than cb(err, [a, b, c]).
    var origCb = this._cb;
    cb = function convertToMultiArgs(err, results) { // jshint ignore:line
      // If called from a deferred, the results are undefined.

      // Each out argument should also be unwrapped. (results was []any)
      results = results ? results.map(function(res, i) {
        var errOrArg = convertOutArgSafe(res, outArgTypes[i], self._controller);
        if (errOrArg[0] && !err) {
          err = errOrArg[0];
        }
        return errOrArg[1];
      }) : [];

      // TODO(alexfandrianto): Callbacks seem to be able to get both error and
      // results, but I think we want to limit it to one or the other.
      var resultsCopy = results.slice();
      resultsCopy.unshift(err);
      origCb.apply(null, resultsCopy);
    };
  }

  var def = new Deferred(cb);
  var ctx = this._ctx;

  if (!this._cb) {
    // If we are using a promise, strip single args out of the arg array.
    // e.g. [ arg1 ] -> arg1
    def.promise = def.promise.then(function(args) {
      if (!Array.isArray(args)) {
        throw new verror.InternalError(ctx,
          'Internal error: incorrectly formatted out args in client');
      }

      // Each out argument should also be unwrapped. (args was []any)
      var unwrappedArgs = args.map(function(outArg, i) {
        return convertOutArg(outArg, outArgTypes[i], self._controller);
      });

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
  switch (type) {
    case Incoming.FINAL_RESPONSE:
      this.handleCompletion(data);
      break;
    case Incoming.STREAM_RESPONSE:
      this.handleStreamData(data);
      break;
    case Incoming.ERROR_RESPONSE:
      this.handleError(data);
      break;
    case Incoming.STREAM_CLOSE:
      this.handleStreamClose();
      break;
    default:
      this.handleError(
          new verror.InternalError(
            this._ctx, 'Received unknown response type from wspr'));
      break;
  }
};

OutstandingRPC.prototype.handleCompletion = function(data) {
  var response;
  try {
    response = vom.decode(byteUtil.hex2Bytes(data));
  } catch (e) {
    this.handleError(
      new verror.InternalError(this._ctx, 'Failed to decode result: ', e));
      return;
  }

  vtrace.getStore(this._ctx).merge(response.traceResponse);
  vtrace.getSpan(this._ctx).finish();

  this._def.resolve(response.outArgs);
  if (this._def.stream) {
    this._def.stream._queueClose();
  }
  this._proxy.dequeue(this._id);
};

OutstandingRPC.prototype.handleStreamData = function(data) {
  if (this._def.stream) {
    try {
      data = vom.decode(byteUtil.hex2Bytes(data));
    } catch (e) {
      this.handleError(
        new verror.InternalError(this._ctx, 'Failed to decode result: ', e));
        return;
    }
    this._def.stream._queueRead(data);
  } else {
    vlog.logger.warn('Ignoring streaming message for non-streaming flow : ' +
        this._id);
  }
};

OutstandingRPC.prototype.handleStreamClose = function() {
  if (this._def.stream) {
    this._def.stream._queueClose();
  }
};

OutstandingRPC.prototype.handleError = function(err) {
  if (this._def.stream) {
    emitStreamError(this._def.stream, err);
    this._def.stream._queueClose();
  }
  this._def.reject(err);
  this._proxy.dequeue(this._id);
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

  var jsonMessage = {
    name: this._name,
    method: this._methodName,
    numInArgs: this._args.length,
    // TODO(bprosnitz) Is || 0 needed?
    numOutArgs: this._numOutParams || 0,
    isStreaming: this._isStreaming,
    traceRequest: vtrace.request(this._ctx),
    deadline: timeout,
    callOptions: this._callOptions
  };

  var header = new RpcRequest(jsonMessage);

  var writer = new ByteArrayMessageWriter();
  var encoder = new Encoder(writer);
  encoder.encode(header);
  for (var i = 0; i < this._args.length; i++) {
    var o = this._args[i];
    if (o instanceof Blessings) {
      o = o.convertToJsBlessings();
    }
    encoder.encode(o);
  }
  return byteUtil.bytes2Hex(writer.getBytes());
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
 * <p>Performs client side binding of a remote service to a native JavaScript
 * stub object.</p>
 *
 * Usage:
 * <pre>
 * runtime.bindTo(context, 'Service/Name').then(function(service) {
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
 * @param {string} name the vanadium name of the service to bind to.
 * @param {function} [cb] if given, this function will be called on
 * completion of the bind.  The first argument will be an error if there is
 * one, and the second argument is an object with methods that perform rpcs to
 * service
 * methods.
 * @return {Promise} An object with methods that perform rpcs to service methods
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
 * var service = runtime.bindWithSignature('Service/Name', signature);
 * service.fooMethod(fooArgs).then(function(methodCallResult) {
 *   // Do stuff with results.
 * }).catch(function(err) {
 *   // Calling fooMethod failed.
 * });
 * </pre>
 *
 * @param {string} name the vanadium name of the service to bind to.
 * @param {Object} signature the service signature of a veryon service.
 * @return {Object} An object with methods that perform rpcs to service methods
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
        if (arg instanceof ClientCallOptions) {
          callOptions = callOptions.concat(arg._toRpcCallOptions());
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
          canonArgs[i] = vdl.Canonicalize.fill(args[i],
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
        callOptions: callOptions
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
 * Returns the object signatures for a given object name.
 * @param {module:vanadium.context.Context} ctx A context.
 * @param {string} name the vanadium name of the service to bind to.
 * @param {function} [cb] if given, this function will be called on
 * completion. The first argument will be an error if there is
 * one, and the second argument is the signature.
 * methods.
 * @return {Promise} Promise that will be resolved with the signatures or
 * rejected with an error if there is one.
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
 * Returns the remote blessings of a server at the given name.
 * @param {module:vanadium.context.Context} ctx A context.
 * @param {string} name the vanadium name of the service to get the remote
 * blessings of.
 * @param {string} [method] the name of the rpc method that will be started in
 * order to read the blessings.  Defaults to 'Signature'.  This only matters in
 * the case when a server responds to different method calls with different
 * blessings.
 * @param {function} [cb] if given, this function will be called on
 * completion. The first argument will be an error if there is
 * one, and the second argument is an array of blessing names.
 * @return {Promise} Promise that will be resolved with the blessing names or
 * rejected with an error if there is one.
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
 * Create a ClientCallOptions object.
 *
 * Client call options can be passed to a service method and are used to
 * configure the RPC call.  They are not passed to the Vanadium RPC service.
 *
 * Currently the only supported key is 'allowedServersPolicy'.
 *
 * @param {Object} opts map of call options.
 * @param {string[]} opts.allowedServersPolicy Array of blessing patterns that
 * the allowed server must match in order for the RPC to be initiated.
 */
Client.prototype.callOptions = function(opts) {
  // TODO(nlacasse): Support other CallOption types.
  var allowedOptions = ['allowedServersPolicy'];

  // Validate opts.
  var keys = Object.keys(opts);
  keys.forEach(function(key) {
    if (allowedOptions.indexOf(key) < 0) {
      throw new verror.BadArgError(null, 'Invalid call option ' + key);
    }
  });

  return new ClientCallOptions(opts);
};

/**
 * Constructor for ClientCallOptions object.
 * @constructor
 * @private
 * @param {Object} opts call options.
 */
function ClientCallOptions(opts) {
  this.opts = opts;
}

/**
 * Convert ClientCallOptions object to array of RpcCallOption VDL values.
 * @private
 * @return {Array} Array of RpcCallOption VDL values.
 */
ClientCallOptions.prototype._toRpcCallOptions = function() {
  var rpcCallOptions = [];
  var keys = Object.keys(this.opts);
  keys.forEach(function(key) {
    var opt = {};
    opt[key] = this.opts[key];
    rpcCallOptions.push(new RpcCallOption(opt));
  }, this);
  return rpcCallOptions;
};

/**
 * Export the module
 */
module.exports = Client;
