/*
 * @fileoverview The server context is a subclass of context that has
 * extra information about the state of a server call.
 */

var context = require('../runtime/context');
var SecurityCall = require('../security/call');
var inherits = require('inherits');

module.exports = ServerCall;

/*
 * A ServerCall is a context.Context subclass that includes additional
 * information about an ongoing server call.
 * @constructor
 * @param request An rpc request object or a ServerCall to clone from.
 * @param controller A Controller instance.  This is only needed if the
 * first arg is not a ServerCall.
 * @param call A context.Context object to derive this new context from.
 * This is only needed if the first arg is not a ServerCall.
 */
function ServerCall(request, controller, ctx) {
  if (!(this instanceof ServerCall)) {
    return new ServerCall(request, controller, ctx);
  }

  if (request instanceof ServerCall) {
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
    if (!request.call.deadline.noDeadline) {
      var fromNow = request.call.deadline.fromNow;
      var timeout = fromNow.seconds * 1000;
      timeout += fromNow.nanos / 1000000;
      this._ctx = this._ctx.withTimeout(timeout);
    } else {
      this._ctx = this._ctx.withCancel();
    }
    var security = new SecurityCall(request.call.securityCall,
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
inherits(ServerCall, context.Context);

ServerCall.prototype.deadline = function() {
  return this._ctx.deadline();
};
ServerCall.prototype.done = function() {
  return this._ctx.done();
};
ServerCall.prototype.waitUntilDone = function(callback) {
  return this._ctx.waitUntilDone(callback);
};
ServerCall.prototype.value = function(key) {
  return this._ctx.value(key);
};
ServerCall.prototype.cancel = function() {
  return this._ctx.cancel();
};
ServerCall.prototype.finish = function() {
  return this._ctx.finish();
};