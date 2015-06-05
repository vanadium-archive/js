// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var blessingMatches = require('./access/blessing-matching');
var vError = require('./../gen-vdl/v.io/v23/verror');

module.exports = defaultAuthorizer;

function defaultAuthorizer(ctx, call, cb) {
  // If the remoteBlessings has a public key, and it refers to ourselves
  // (i.e a self rpc), then we always authorize.
  if (call.remoteBlessings.publicKey &&
    call.localBlessings.publicKey === call.remoteBlessings.publicKey) {
    return cb();
  }
  var matches = call.localBlessingStrings.some(function(l) {
    return call.remoteBlessingStrings.some(function(r) {
      return blessingMatches(l, r) || blessingMatches(r, l);
    });
  });

  if (matches) {
    return cb();
  }
  return cb(new vError.NoAccessError(ctx, 'authorization failed'));
}
