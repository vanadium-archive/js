/*
 * @fileoverview The server context is a subclass of context that has
 * extra information about the state of a server call.
 */

var Blessings = require('../security/blessings');
var context = require('../runtime/context');
var inherits = require('util').inherits;
var constants = require('./constants');

module.exports = ServerContext;

/*
 * A ServerContext is a context.Context subclass that includes additional
 * information about an ongoing server call.
 * @constructor
 * @param request An rpc request object.
 * @param proxy A proxy instance.
 */
function ServerContext(request, proxy) {
  if (!(this instanceof ServerContext)) {
    return new ServerContext();
  }

  this._ctx = new context.Context();
  if (request.context.timeout !== constants.NO_TIMEOUT) {
    this._ctx = this._ctx.withTimeout(request.context.timeout);
  } else {
    this._ctx = this._ctx.withCancel();
  }
  this.suffix = request.context.suffix;
  this.name = request.context.name;
  this.remoteBlessings = new Blessings(
                               request.context.remoteBlessings.handle,
                               request.context.remoteBlessings.publicKey,
                               proxy);
  this.remoteBlessingStrings = request.context.remoteBlessingStrings;
}
inherits(ServerContext, context.Context);

ServerContext.prototype.deadline = function() {
  return this._ctx.deadline();
};
ServerContext.prototype.done = function() {
  return this._ctx.done();
};
ServerContext.prototype.waitUntilDone = function(callback) {
  return this._ctx.waitUntilDone(callback);
};
ServerContext.prototype.value = function(key) {
  return this._ctx.value();
};
ServerContext.prototype.cancel = function() {
  return this._ctx.cancel();
};
