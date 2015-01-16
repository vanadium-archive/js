/**
 *  @fileoverview Client for the veyron service.
 *
 *  Usage:
 *  var cl = new client(proxyConnection);
 *  var service = cl.bindTo('EndpointAddress', 'ServiceName');
 *  resultPromise = service.MethodName(arg);
 *  @private
 */

var Promise = require('../lib/promise');
var Deferred = require('../lib/deferred');
var vLog = require('../lib/vlog');
var ErrorConversion = require('../proxy/error-conversion');
var Stream = require('../proxy/stream');
var verror = require('../lib/verror');
var MessageType = require('../proxy/message-type');
var IncomingPayloadType = require('../proxy/incoming-payload-type');
var context = require('../runtime/context');
var constants = require('./constants');
var DecodeUtil = require('../lib/decode-util');
var SimpleHandler = require('../proxy/simple-handler');
var vom = require('vom');
var EncodeUtil = require('../lib/encode-util');

var OutstandingRPC = function(ctx, options, cb) {
  this._ctx = ctx;
  this._proxy = options.proxy;
  this._id = -1;
  this._name = options.name;
  this._methodName = options.methodName,
  this._args = options.args;
  this._numOutParams = options.numOutParams;
  this._isStreaming = options.isStreaming || false;
  this._cb = cb;
  this._def = null;
};

OutstandingRPC.prototype.start = function() {
  this._id = this._proxy.nextId();

  var cb;
  if (this._cb) {
    // Wrap the callback to call with multiple arguments cb(err, a, b, c)
    // rather than cb(err, [a, b, c]).
    var origCb = this._cb;
    cb = function convertToMultiArgs(err, results) { // jshint ignore:line
      results = results || []; // If called from a deferred, args is undefined
      var resultsCopy = results.slice();
      resultsCopy.unshift(err);
      origCb.apply(null, resultsCopy);
    };
  }

  var def = new Deferred(cb);

  if (!this._cb) {
    // If we are using a promise, strip single args out of the arg array.
    // e.g. [ arg1 ] -> arg1
    def.promise = def.promise.then(function(args) {
      if (!Array.isArray(args)) {
        throw new verror.InternalError(
          'Internal error: incorrectly formatted out args in client');
      }
      // We expect:
      // 0 args - return; // NOT return [];
      // 1 args - return a; // NOT return [a];
      // 2 args - return [a, b] ;
      //
      // Convert the results from array style to the expected return style.
      // undefined, a, [a, b], [a, b, c] etc
      switch(args.length) {
        case 0:
          return undefined;
        case 1:
          return args[0];
        default:
          return args;
      }
    });
  }

  var streamingDeferred = null;
  if (this._isStreaming) {
    streamingDeferred = new Deferred();
    def.stream = new Stream(this._id, streamingDeferred.promise, true);
    def.promise.stream = def.stream;
  }

  var message = this.constructMessage();

  this._def = def;
  this._proxy.cancelFromContext(this._ctx, this._id);
  this._proxy.sendRequest(message, MessageType.REQUEST, this, this._id);
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
    case IncomingPayloadType.FINAL_RESPONSE:
      this.handleCompletion(data);
      break;
    case IncomingPayloadType.STREAM_RESPONSE:
      this.handleStreamData(data);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      this.handleError(data);
      break;
    case IncomingPayloadType.STREAM_CLOSE:
      this.handleStreamClose();
      break;
    default:
      this.handleError(
          new verror.InternalError('Recieved unknown response type from wspr'));
      break;
  }
};

OutstandingRPC.prototype.handleCompletion = function(data) {
  try {
    data = DecodeUtil.decode(data);
  } catch (e) {
    this.handleError(
      new verror.InternalError('Failed to decode result: ' + e));
      return;
  }
  this._def.resolve(data);
  if (this._def.stream) {
    this._def.stream._queueRead(null);
  }
  this._proxy.dequeue(this._id);
};

OutstandingRPC.prototype.handleStreamData = function(data) {
  if (this._def.stream) {
    try {
      data = DecodeUtil.decode(data);
    } catch (e) {
      this.handleError(
        new verror.InternalError('Failed to decode result: ' + e));
        return;
    }

    this._def.stream._queueRead(data);
  } else {
    vLog.warn('Ignoring streaming message for non-streaming flow : ' +
        this._id);
  }
};

OutstandingRPC.prototype.handleStreamClose = function() {
  if (this._def.stream) {
    this._def.stream._queueRead(null);
  }
};

OutstandingRPC.prototype.handleError = function(data) {
  var err;
  if (data instanceof Error) {
    err = data;
  } else {
    err = ErrorConversion.toJSerror(data);
  }

  if (this._def.stream) {
    this._def.stream.emit('error', err);
    this._def.stream._queueRead(null);
  }
  this._def.reject(err);
  this._proxy.dequeue(this._id);
};


/**
 * Construct a message to send to the veyron native code
 * @private
 * @return {string} json string to send to jspr
 */
OutstandingRPC.prototype.constructMessage = function() {
  var deadline = this._ctx.deadline();
  var timeout = constants.NO_TIMEOUT;
  if (deadline !== null) {
    timeout = deadline - Date.now();
  }

  var jsonMessage = {
    name: this._name,
    method: this._methodName,
    inArgs: this._args,
    numOutArgs: this._numOutParams || 1,
    isStreaming: this._isStreaming,
    timeout: timeout
  };
  return EncodeUtil.encode(jsonMessage);
};

/**
 * Client for the veyron service.
 * @constructor
 * @param {Object} proxyConnection Veyron proxy client
 */
function Client(proxyConnection) {
  if (!(this instanceof Client)) {
    return new Client(proxyConnection);
  }

  this._proxyConnection = proxyConnection;
}

/**
 * Performs client side binding of a remote service to a native javascript
 * stub object.
 * @param {Context} A context.
 * @param {string} name the veyron name of the service to bind to.
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
    vLog.debug('Received signature for:', name, serviceSignature);
    var boundObject = {};

    function bindMethod(methodSig) {
      var method = vom.MiscUtil.uncapitalize(methodSig.name);

      boundObject[method] = function(ctx /*, arg1, arg2, ..., callback*/) {
        var args = Array.prototype.slice.call(arguments, 0);
        var callback;
        var err;

        // Callback is the last function argument, pull it out of the args
        if (typeof args[args.length - 1] === 'function') {
          callback = args.pop();
       }

        // Require first arg to be a Context
        if (args[0] instanceof context.Context) {
          ctx = args.shift();
        } else {
          err = new Error('First argument must be a Context object.');

          if (callback) {
            return callback(err);
          } else {
            return Promise.reject(err);
          }
        }

        if (args.length !== methodSig.inArgs.length) {
          var expectedArgs = methodSig.inArgs.map(function(arg) {
            return arg.name;
          });

          // TODO(jasoncampbell): Create an constrcutor for this error so it
          // can be created with less ceremony and checked in a
          // programatic way:
          //
          //     service
          //     .foo('bar')
          //     .catch(ArgumentsArityError, function(err) {
          //       console.error('invalid number of arguments')
          //     })
          //
          var message = 'Client RPC call  ' + methodSig.name +
            '(' + Array.prototype.slice.call(arguments, 1) + ') ' +
            'had an incorrect number of arguments. '+
            'Expected format: ' + methodSig.name +
            '(' + expectedArgs + ')';

          // TODO(bprosnitz) v.io/core/javascript.IncorrectArgCount.
          err = new verror.VeyronError(message,
            {
              id: 'v.io/core/javascript.IncorrectArgCount',
              action: verror.Actions.NoRetry,
            });

          if (callback) {
            return callback(err);
          } else {
            return Promise.reject(err);
          }
        }


        var isStreaming = (typeof methodSig.inStream === 'object'  &&
          methodSig.inStream !== null) ||
          (typeof methodSig.outStream === 'object' &&
          methodSig.outStream !== null);

        var rpc = new OutstandingRPC(ctx, {
           proxy: client._proxyConnection,
           name: name,
           methodName: methodSig.name,
           args: args,
           numOutParams: methodSig.outArgs.length,
           isStreaming: isStreaming
        }, callback);

        return rpc.start();
      };
    }

    serviceSignature.forEach(function(sig) {
      sig.methods.forEach(function(meth) {
        bindMethod(meth);
      });
    });

    def.resolve(boundObject);
  }).catch(function(err) {
    def.reject(err);
  });

  return def.promise;
};

/**
 * Returns the object signatures for a given object name.
 * @param {Context} A context.
 * @param {string} name the veyron name of the service to bind to.
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

  // Require first arg to be a Context
  if (! (ctx instanceof context.Context)) {
    var err = new Error('First argument must be a Context object.');
    deferred.reject(err);
    return deferred.promise;
  }

  var proxy = this._proxyConnection;

  var cacheEntry = proxy.signatureCache.get(name);
  if (cacheEntry) {
    deferred.resolve(cacheEntry);
    return deferred.promise;
  }

  var requestDef = new Deferred();
  requestDef.promise.then(function(args) {
    // If the signature came off the wire, we need to vom decode the bytes.
    if (typeof args === 'string') {
      try {
        return DecodeUtil.decode(args);
      } catch (e) {
        return Promise.reject(
          new verror.InternalError('Failed to decode result: ' + e));
      }
    } else {
      return args[0];
    }
  }).then(function(signature) {
    proxy.signatureCache.set(name, signature);
    deferred.resolve(signature);
  }).catch(function(err) {
    deferred.reject(err);
  });

  var messageJSON = { name: name };
  var message = JSON.stringify(messageJSON);

  var id = proxy.nextId();
  var handler = new SimpleHandler(requestDef, proxy, id);
  proxy.cancelFromContext(ctx, id);
  proxy.sendRequest(message, MessageType.SIGNATURE, handler, id);

  return deferred.promise;
};

/**
 * Export the module
 */
module.exports = Client;
