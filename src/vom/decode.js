// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var ByteArrayMessageReader = require('./byte-array-message-reader');
var Decoder = require('./decoder');

module.exports = decode;
/**
 * Decode VOM-decodes the given data into the provided value using a new
 * instance of a VOM decoder.
 *
 * @param  {Uint8Array} bytes    VOM-encoded bytes
 * @param  {boolean} [deepWrap=false] true if the values on the object should
 * remain wrapped with type information deeply, false (default) to strip
 * deep type information and obtain a more usage-friendly value
 * @return {*} decoded value
 * @memberof module:vanadium.vom
 */
function decode(bytes, deepWrap) {
  var reader = new ByteArrayMessageReader(bytes);
  var decoder = new Decoder(reader, deepWrap);
  return decoder.decode();
}
