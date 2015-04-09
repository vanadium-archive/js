// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var blessingMatches = require('./access/blessing-matching');
var vError = require('./../gen-vdl/v.io/v23/verror');
var getSecurityCallFromContext =
  require('./context').getSecurityCallFromContext;

module.exports = authorizer;

function authorizer(ctx, cb) {
  // If the remoteBlessings has a public key, and it refers to ourselves
  // (i.e a self rpc), then we always authorize.
  var call = getSecurityCallFromContext(ctx);
  if (call.remoteBlessings.publicKey &&
    call.localBlessings.publicKey === call.remoteBlessings.publicKey) {
    return cb();
  }
  var matchesLocal = call.localBlessingStrings.some(function(l) {
    return blessingMatches(l, call.remoteBlessingStrings);
  });
  if (matchesLocal) {
    return cb();
  }

  var matchesRemote = call.remoteBlessingStrings.some(function(l) {
    return blessingMatches(l, call.localBlessingStrings);
  });
  if (matchesRemote) {
    return cb();
  }
  return cb(new vError.NoAccessError(ctx, 'authorization failed'));
}
