/*
 * @fileoverview The server context is a subclass of context that has
 * extra information about the state of a server call.
 */

var context = require('../runtime/context');
var SecurityContext = require('../security/context');
var inherits = require('inherits');
var constants = require('./constants');

module.exports = ServerContext;

/*
 * A ServerContext is a context.Context subclass that includes additional
 * information about an ongoing server call.
 * @constructor
 * @param request An rpc request object or a ServerContext to clone from.
 * @param controller A Controller instance.  This is only needed if the
 * first arg is not a ServerContext.
 * @param ctx A context.Context object to derive this new context from.
 * This is only needed if the first arg is not a ServerContext.
 */
function ServerContext(request, controller, ctx) {
  if (!(this instanceof ServerContext)) {
    return new ServerContext();
  }

  if (request instanceof ServerContext) {
    this._ctx = request._ctx;
    this.suffix = request.suffix;
    this.name = request.name;
    this.localBlessings = request.localBlessings;
    this.remoteBlessings = request.remoteBlessings;
    this.localBlessingStrings = request.localBlessingStrings;
    this.remoteBlessingStrings = request.remoteBlessingStrings;
    this.localEndpoint = request.localEndpoint;
    this.remoteEndpoint = request.remoteEndpoint;
    this.methodTags = request.methodTags;
  } else {
    this._ctx = ctx;
    if (!request.context.timeout.equals(constants.NO_TIMEOUT)) {
      this._ctx = this._ctx.withTimeout(request.context.timeout);
    } else {
      this._ctx = this._ctx.withCancel();
    }
    var security = new SecurityContext(request.context.securityContext,
                                       controller);
    this.suffix = security.suffix;
    this.name = security.name;
    this.localBlessings = security.localBlessings;
    this.remoteBlessings = security.remoteBlessings;
    this.localBlessingStrings = security.localBlessingStrings;
    this.remoteBlessingStrings = security.remoteBlessingStrings;
    this.localEndpoint = security.localEndpoint;
    this.remoteEndpoint = security.remoteEndpoint;
    this.methodTags = security.methodTags;
  }
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
  return this._ctx.value(key);
};
ServerContext.prototype.cancel = function() {
  return this._ctx.cancel();
};
ServerContext.prototype.finish = function() {
  return this._ctx.finish();
};
