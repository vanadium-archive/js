// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A context passed to the authorizer
 * @private
 */
var Blessings = require('./blessings.js');
module.exports = Call;

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
  this.localBlessingStrings = call.localBlessingStrings;
  this.remoteBlessingStrings = call.remoteBlessingStrings;
  // TODO(bjornick): Create endpoints.
  this.localEndpoint = call.localEndpoint;
  this.remoteEndpoint = call.remoteEndpoint;
}
