// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var ByteArrayMessageWriter = require('./byte-array-message-writer');
var Encoder = require('./encoder');

module.exports = encode;
/**
 * Encode encodes the provided value using a new instance of an Encoder.
 * @param  {*} v value to encode
 * @param {Type=} t optional type to convert to
 * @return {Uint8Array} encoded bytes
 * @memberof module:vanadium.vom
 */
function encode(v, t) {
  var writer = new ByteArrayMessageWriter();
  var encoder = new Encoder(writer);
  encoder.encode(v, t);
  return writer.getBytes();
}
