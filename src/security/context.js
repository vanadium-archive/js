/**
 * @fileoverview A context passed to the authorizer
 * @private
 */
var Blessings = require('./blessings.js');
module.exports = Context;

function Context(ctx, controller) {
  this.method = ctx.method;
  this.suffix = ctx.suffix;
  // TODO(bjornick): Use the enums.
  this.methodTags = ctx.methodTags;
  this.localBlessings = new Blessings(ctx.localBlessings.handle,
                                      ctx.localBlessings.publicKey,
                                      controller);
  this.remoteBlessings = new Blessings(ctx.remoteBlessings.handle,
                                       ctx.remoteBlessings.publicKey,
                                       controller);
  this.localBlessingStrings = ctx.localBlessingStrings;
  this.remoteBlessingStrings = ctx.remoteBlessingStrings;
  // TODO(bjornick): Create endpoints.
  this.localEndpoint = ctx.localEndpoint;
  this.remoteEndpoint = ctx.remoteEndpoint;
}
