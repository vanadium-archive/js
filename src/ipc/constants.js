// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Constants related to ipc.
 * @private
 */

var BigInt = require('../vdl/big-int');

module.exports = {
  // NO_TIMEOUT is a special value sent over the wire to indicate
  // that the call should have no timeout.  It is:
  // (2^63 - 1) / 1000000.  The (2^63 - 1) is the equivalant constant in Go
  // and the 1000000 is a conversion from ns to ms.
  NO_TIMEOUT: BigInt.fromNativeNumber(9223372036854)
};
