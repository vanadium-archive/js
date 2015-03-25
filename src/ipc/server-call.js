// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * @fileoverview The server context is a subclass of context that has
 * extra information about the state of a server call.
 */

var context = require('../runtime/context');
var SecurityCall = require('../security/call');
var inherits = require('inherits');
var vtrace = require('../vtrace');

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
    this._cancelable = request._cancelable;
    this.suffix = request.suffix;
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
    this._cancelable = this._ctx;
    var security = new SecurityCall(request.call.securityCall,
                                       controller);
    var spanName = '<jsserver>"'+security.suffix+'".'+request.method;
    // TODO(mattr): We need to enforce some security on trace responses.
    this._ctx = vtrace.withContinuedTrace(
      this._ctx, spanName, request.call.traceRequest);

    this.suffix = security.suffix;
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
ServerCall.prototype.cancel = function(key) {
  return this._cancelable.cancel();
};
ServerCall.prototype.finish = function(key) {
  return this._cancelable.finish();
};
