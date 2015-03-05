/**
 * @fileoverview A simple handler that resolves or rejects a promise
 * on a response from the proxy.
 * @private
 */
var Incoming = require('./message-type').Incoming;
var StreamHandler = require('./stream-handler');
var vError = require('../gen-vdl/v.io/v23/verror');

/**
 * An object that rejects/resolves a promise based on a response
 * from the proxy.
 * @constructor
 * @private
 * @param {Context} cxt
 * @param {Deferred} def the promise to resolve/reject
 * @param {ProxyConnection} proxy the proxy from which to dequeue the handler
 * @param {number} id the flow id of the message
 */
var Handler = function(ctx, def, proxy, id) {
  this._ctx = ctx;
  this._proxy = proxy;
  this._def = def;
  this._id = id;
  if (def.stream) {
    this._streamHandler = new StreamHandler(ctx, def.stream);
  }

};

Handler.prototype.handleResponse = function(type, message) {
  // If there is a stream, let stream handler process it.
  if (this._streamHandler &&
    this._streamHandler.handleResponse(type, message)) {
    return;
  }

  switch (type) {
    case Incoming.FINAL_RESPONSE:
      this._def.resolve(message);
      break;
    case Incoming.ERROR_RESPONSE:
      this._def.reject(message);
      break;
    default:
      this._def.reject(
        new vError.InternalError(this._ctx,
                                 ['unknown response type ' + type]));
  }
  this._proxy.dequeue(this._id);
};

module.exports = Handler;
