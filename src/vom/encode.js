// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var ByteArrayMessageWriter = require('./byte-array-message-writer');
var Encoder = require('./encoder');

module.exports = encode;
/**
 * VOM encode a value
 *
 * @param  {*} v value to encode
 * @return {Uint8Array} encoded bytes
 * @memberof module:vanadium.vom
 */
function encode(v) {
  var writer = new ByteArrayMessageWriter();
  var encoder = new Encoder(writer);
  encoder.encode(v);
  return writer.getBytes();
}
