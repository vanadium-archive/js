// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview blessing pattern matcher
 * @private
 */

var vdlSecurity = require('../../gen-vdl/v.io/v23/security');
module.exports = blessingMatches;

// A blessing matches a pattern iff one of the following holds:
// - the pattern is '...' which is matched by all blessings.
// - the pattern ends in ':$' and the blessing is the same as the
//   pattern string with the ':$' stripped out.
// - the pattern does not end in ':$' and the blessing is an extension
//   of the pattern.
function blessingMatches(blessing, pattern) {
  // TODO(ataly, ashankar): Do we need to check that the pattern is valid?
  if (pattern === vdlSecurity.AllPrincipals.val) {
    return true;
  }
  var blessingParts = blessing.split(vdlSecurity.ChainSeparator);
  var patternParts = pattern.split(vdlSecurity.ChainSeparator);

  for (var i = 0; i < patternParts.length; i++) {
    // If there is a '$' at the end of the pattern then
    // we have a match if there are no more blessingParts
    // left
    if (patternParts[i] === vdlSecurity.NoExtension.val) {
      return i === patternParts.length-1 && i === blessingParts.length;
    }

    if ((i >= blessingParts.length) || (blessingParts[i] !== patternParts[i])) {
      return false;
    }
  }
  return true;
}
