// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var ByteMessageWriter = require('./byte-message-writer');
var Encoder = require('./encoder');

module.exports = encode;
/**
 * Encode encodes the provided value using a new instance of an Encoder.
 * @param  {*} v value to encode
 * @param {module:vanadium.vom.Type=} t optional type to convert to
 * @param {module:vanadium.vom.TypeEncoder} te optional type encoder to
 * use.
 * @param {number} version vom version (e.g. 0x80, 0x81, ...)
 * @return {Uint8Array} encoded bytes
 * @memberof module:vanadium.vom
 */
function encode(v, t, te, version) {
  var writer = new ByteMessageWriter(version);
  var encoder = new Encoder(writer, te, version);
  encoder.encode(v, t);
  return writer.getBytes();
}
