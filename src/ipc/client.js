/**
 *  @fileoverview Client for the veyron service.
 *
 *  Usage:
 *  var cl = new client(proxyConnection);
 *  var service = cl.bindTo('EndpointAddress', 'ServiceName');
 *  resultPromise = service.MethodName(arg);
 */

var Promise = require('../lib/promise');
var Deferred = require('../lib/deferred');
var vLog = require('../lib/vlog');
var ErrorConversion = require('../proxy/error_conversion');
var Stream = require('../proxy/stream');
var vError = require('../lib/verror');
var MessageType = require('../proxy/message_type');
var IncomingPayloadType = require('../proxy/incoming_payload_type');

var OutstandingRPC = function(options, cb) {
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
  var def = new Deferred(this._cb);

  var streamingDeferred = null;
  if (this._isStreaming) {
    streamingDeferred = new Deferred();
    def.stream = new Stream(this._id, streamingDeferred.promise, true);
    def.promise.stream = def.stream;
  }

  var message = this.constructMessage();

  this._def = def;
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
          new vError.InternalError('Recieved unknown response type from wspr'));
      break;
  }
};

OutstandingRPC.prototype.handleCompletion = function(data) {
  if (data.length === 1) {
    data = data[0];
  }
  this._def.resolve(data);
  if (this._def.stream) {
    this._def.stream._queueRead(null);
  }
  this._proxy.dequeue(this._id);
};

OutstandingRPC.prototype.handleStreamData = function(data) {
  if (this._def.stream) {
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
  if (data instanceof vError.VeyronError) {
    err = data;
  } else {
    err = ErrorConversion.toJSerror(data);
  }

  if (this._def.stream) {
    this._def.stream.emit('error', err);
    this._def.stream.queueRead(null);
  }
  this._def.reject(err);
  this._proxy.dequeue(this._id);
};


/**
 * Construct a message to send to the veyron native code
 * @return {string} json string to send to jspr
 */
OutstandingRPC.prototype.constructMessage = function() {
  var jsonMessage = {
    name: this._name,
    method: this._methodName,
    inArgs: this._args || [],
    numOutArgs: this._numOutParams || 1,
    isStreaming: this._isStreaming
  };
  return JSON.stringify(jsonMessage);
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
 * @param {string} name the veyron name of the service to bind to.
 * @param {object} optServiceSignature if set, javascript signature of methods
 * available in the remote service.
 * @param {function} [cb] if given, this function will be called on completion
 * of the bind.  The first argument will be an error if there is one, and the
 * second argument is an object with methods that perform rpcs to service
 * methods.
 * @return {Promise} An object with methods that perform rpcs to service methods
 */
Client.prototype.bindTo = function(name, optServiceSignature, cb) {
  var self = this;

  if (typeof optServiceSignature === 'function') {
    cb = optServiceSignature;
    optServiceSignature = undefined;
  }

  var def = new Deferred(cb);
  var serviceSignaturePromise;

  if (optServiceSignature !== undefined) {
    serviceSignaturePromise = Promise.resolve(optServiceSignature);
  } else {
    vLog.debug('Requesting service signature for:', name);
    serviceSignaturePromise = self._proxyConnection.getServiceSignature(name);
  }

  var promise = def.promise;

  serviceSignaturePromise.then(function(serviceSignature) {
    vLog.debug('Received signature for:', name, serviceSignature);
    var boundObject = {};

    var bindMethod = function(methodName) {
      var methodInfo = serviceSignature[methodName];
      var numOutParams = methodInfo.numOutArgs;
      boundObject[methodName] = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        var cb = null;
        if (args.length === methodInfo.inArgs.length + 1) {
          cb = args[args.length - 1];
          args = args.slice(0, methodInfo.inArgs.length);
        }
        if (args.length !== methodInfo.inArgs.length) {
          throw new Error('Invalid number of arguments to "' +
            methodName + '". Expected ' + methodInfo.inArgs.length +
            ' but there were ' + args.length);
        }
        var rpc = new OutstandingRPC({
           proxy: self._proxyConnection,
           name: name,
           methodName: methodName,
           args: args,
           numOutParams: numOutParams,
           isStreaming: methodInfo.isStreaming
        }, cb);
        return rpc.start();
      };
    };

    for (var methodName in serviceSignature) {
      if (serviceSignature.hasOwnProperty(methodName)) {
        bindMethod(methodName);
      }
    }

    //Also stub out signature() on the bound object.
    boundObject.signature = function() {
      return Promise.resolve(serviceSignature);
    };

    def.resolve(boundObject);
  }).catch (def.reject);

  return promise;
};

/**
 * Export the module
 */
module.exports = Client;
