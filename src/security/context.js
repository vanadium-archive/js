/**
 * @fileoverview A context passed to the authorizer
 */
var Blessings = require('./blessings.js');
module.exports = Context;

function Context(ctx, proxy) {
  this.method = ctx.method;
  this.name = ctx.name;
  this.suffix = ctx.suffix;
  // TODO(bjornick): Use the enums.
  this.methodTags = ctx.methodTags;
  this.localBlessings = new Blessings(ctx.localBlessings.handle,
                                      ctx.localBlessings.publicKey,
                                      proxy);
  this.remoteBlessings = new Blessings(ctx.remoteBlessings.handle,
                                       ctx.remoteBlessings.publicKey,
                                       proxy);
  this.localBlessingStrings = ctx.localBlessingStrings;
  this.remoteBlessingStrings = ctx.remoteBlessingStrings;
  // TODO(bjornick): Create endpoints.
  this.localEndpoint = ctx.localEndpoint;
  this.remoteEndpoint = ctx.remoteEndpoint;
}
