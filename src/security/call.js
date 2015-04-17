// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A context passed to the authorizer
 * @private
 */
var Blessings = require('./blessings.js');
module.exports = Call;

/**
 * @summary Call defines the state available for authorizing a principal.
 * @name SecurityCall
 * @property {string} method The method being invoked
 * @property {string} suffix The object name suffix of the request
 * @property {module:vanadium.security~Blessings} localBlessings The blessings
 * bound to the local end.
 * @property {string} localBlessingStrings The validated names for the local
 * end.
 * @property {module:vanadium.security~Blessings} remoteBlessings The blessings
 * bound to the remote end.
 * @property {string} remoteBlessingStrings The validated names for the remote
 * end.
 * @property {string} localEndpoint The endpoint string for the local end
 * @property {string} remoteEndpoint The endpoint string for the remote end
 * @inner
 * @memberof module:vanadium.security
 */
function Call(call, controller) {
  this.method = call.method;
  this.suffix = call.suffix;
  // TODO(bjornick): Use the enums.
  this.methodTags = call.methodTags;
  this.localBlessings = new Blessings(call.localBlessings.handle,
                                      call.localBlessings.publicKey,
                                      controller);
  this.remoteBlessings = new Blessings(call.remoteBlessings.handle,
                                       call.remoteBlessings.publicKey,
                                       controller);
  if (call.grantedBlessings) {
    this.grantedBlessings = new Blessings(call.grantedBlessings.handle,
                                          call.grantedBlessings.publicKey,
                                          controller);
  }
  this.localBlessingStrings = call.localBlessingStrings;
  this.remoteBlessingStrings = call.remoteBlessingStrings;
  // TODO(bjornick): Create endpoints.
  this.localEndpoint = call.localEndpoint;
  this.remoteEndpoint = call.remoteEndpoint;
}

Call.prototype.clone = function() {
  var res = Object.create(this.constructor.prototype);
  Object.defineProperty(res, 'constructor', { value: this.constructor });
  for (var key in this) {
    if (!this.hasOwnProperty(key)) {
      continue;
    }
    res[key] = this[key];
  }
  return res;
};
