// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @private
 * @fileoverview Helper methods for vom and hex encode/decode.
 */

var byteUtil = require('../vdl/byte-util');
var vom = require('../vom');

module.exports = {
  decode: decode,
  encode: encode
};

function encode(x) {
  return byteUtil.bytes2Hex(vom.encode(x));
}

function decode(x) {
  return vom.decode(byteUtil.hex2Bytes(x));
}
