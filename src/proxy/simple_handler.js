/**
 * @fileoverview A simple handler that resolves or rejects a promise
 * on a response from the proxy.
 */
var IncomingPayloadType = require('./incoming_payload_type');
var ErrorConversion = require('./error_conversion');
var vError = require('./../lib/verror');

/**
 * An object that rejects/resolves a promise based on a response
 * from the proxy.
 * @constructor
 * @param def the promise to resolve/reject
 * @param proxy the proxy from which to dequeue the handler
 * @param id the flow id of the message
 */
var Handler = function(def, proxy, id) {
  this._proxy = proxy;
  this._def = def;
  this._id = id;
};

Handler.prototype.handleResponse = function(type, message) {
  switch (type) {
    case IncomingPayloadType.FINAL_RESPONSE:
      this._def.resolve(message);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      var err = ErrorConversion.toJSerror(message);
      this._def.reject(err);
      break;
    default:
      this._def.reject(
          new vError.InternalError('unknown response type ' + type));
  }
  this._proxy.dequeue(this._id);
};

module.exports = Handler;
