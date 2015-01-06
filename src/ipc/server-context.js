/*
 * @fileoverview The server context is a subclass of context that has
 * extra information about the state of a server call.
 */

var context = require('../runtime/context');
var SecurityContext = require('../security/context');
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
  var security = new SecurityContext(request.context.securityContext, proxy);

  this.suffix = security.suffix;
  this.name = security.name;
  this.localBlessings = security.localBlessings;
  this.remoteBlessings = security.remoteBlessings;
  this.localBlessingStrings = security.localBlessingStrings;
  this.remoteBlessingStrings = security.remoteBlessingStrings;
  this.localEndpoint = security.localEndpoint;
  this.remoteEndpoint = security.remoteEndpoint;
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
