// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var blessingMatches = require('./blessing-matching');
var vError = require('./../gen-vdl/v.io/v23/verror');
var context = require('./../runtime/context');

module.exports = authorizer;

function authorizer(ctx) {
  if (ctx.localBlessings.publicKey === ctx.remoteBlessings.publicKey) {
    return null;
  }
  var matchesLocal = ctx.localBlessingStrings.some(function(l) {
    return blessingMatches(l, ctx.remoteBlessingStrings);
  });
  if (matchesLocal) {
    return null;
  }

  var matchesRemote = ctx.remoteBlessingStrings.some(function(l) {
    return blessingMatches(l, ctx.localBlessingStrings);
  });
  if (matchesRemote) {
    return null;
  }
  return new vError.NoAccessError(new context.Context(),
                                  ['authorization failed']);
}
