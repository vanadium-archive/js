// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Helper functions to get random values.
 * @private
 */

// This will use window.crypto in browser, and node's crypto library in node.
var randomBytes = require('randombytes');

module.exports = {
  int32: int32,
  hex: hex
};

function int32() {
  return randomBytes(4).readInt32BE(0);
}

function hex(len) {
  len = len || 16;
  return randomBytes(Math.ceil(len/2)).toString('hex').substr(0, len);
}
