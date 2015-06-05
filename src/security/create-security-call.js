// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A security information passes to authorizer and validator.
 * @private
 */
module.exports = createSecurityCall;

/**
 * Create a security call object. This exists so that we can resolve blessings
 * before the user is given the object.
 * @private
 */
function createSecurityCall(input, blessingsCache) {
  var call = new Call();
  call.method = input.method;
  call.suffix = input.suffix;
  call.methodTags = input.methodTags;
  call.localBlessingStrings = input.localBlessingStrings;
  call.remoteBlessingStrings = input.remoteBlessingStrings;
  // TODO(bjornick): Create endpoints.
  call.localEndpoint = input.localEndpoint;
  call.remoteEndpoint = input.remoteEndpoint;

  var promises = [];
  promises.push(blessingsCache.blessingsFromId(input.localBlessings)
  .then(function(localBlessings) {
    call.localBlessings = localBlessings;
  }));
  promises.push(blessingsCache.blessingsFromId(input.remoteBlessings)
  .then(function(remoteBlessings) {
    call.remoteBlessings = remoteBlessings;
    return call;
  }));

  return Promise.all(promises).then(function() {
    return call;
  });
}

/**
 * @summary Call defines the state available for authorizing a principal.
 * @name SecurityCall
 * @property {string} method The method being invoked.
 * @property {string} suffix The object name suffix of the request.
 * @property {module:vanadium.security~Blessings} localBlessings The blessings
 * bound to the local end.
 * @property {string} localBlessingStrings The validated names for the local
 * end.
 * @property {module:vanadium.security~Blessings} remoteBlessings The blessings
 * bound to the remote end.
 * @property {string} remoteBlessingStrings The validated names for the remote
 * end.
 * @property {string} localEndpoint The endpoint string for the local end.
 * @property {string} remoteEndpoint The endpoint string for the remote end.
 * @inner
 * @memberof module:vanadium.security
 */
function Call() {
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
