/**
 * @fileoverview A context passed to the authorizer
 */
var PublicId = require('./public.js');
module.exports = Context;

function Context(ctx, proxy) {
  this.method = ctx.method;
  this.name = ctx.name;
  this.suffix = ctx.suffix;
  // TODO(bjornick): Use the enums.
  this.label = ctx.label;
  this.localId = new PublicId(ctx.localID.names, ctx.localID.handle, proxy);
  this.remoteId = new PublicId(ctx.remoteID.names, ctx.remoteID.handle, proxy);
  // TODO(bjornick): Create endpoints.
  this.localEndpoint = ctx.localEndpoint;
  this.remoteEndpoint = ctx.remoteEndpoint;
}
