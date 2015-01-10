/**
 * @fileoverview A simple handler that resolves or rejects a promise
 * on a response from the proxy.
 * @private
 */
var IncomingPayloadType = require('./incoming-payload-type');
var ErrorConversion = require('./error-conversion');
var StreamHandler = require('./stream-handler');
var vError = require('./../lib/verror');

/**
 * An object that rejects/resolves a promise based on a response
 * from the proxy.
 * @constructor
 * @private
 * @param def the promise to resolve/reject
 * @param proxy the proxy from which to dequeue the handler
 * @param id the flow id of the message
 */
var Handler = function(def, proxy, id) {
  this._proxy = proxy;
  this._def = def;
  this._id = id;
  if (def.stream) {
    this._streamHandler = new StreamHandler(def.stream);
  }

};

Handler.prototype.handleResponse = function(type, message) {
  // If there is a stream, let stream handler process it.
  if (this._streamHandler &&
    this._streamHandler.handleResponse(type, message)) {
    return;
  }

  switch (type) {
    case IncomingPayloadType.FINAL_RESPONSE:
      this._def.resolve(message);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      var err = message;
      if (!(err instanceof Error)) {
        err = ErrorConversion.toJSerror(message);
      }
      this._def.reject(err);
      break;
    default:
      this._def.reject(
        new vError.InternalError('unknown response type ' + type));
  }
  this._proxy.dequeue(this._id);
};

module.exports = Handler;