// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/**
 * @summary Namespace vom implements Vanadium Object Marshaling, a serialization
 * protocol.  Vom is used in Vanadium to enable interchange of user-defined data
 * structures across networks, languages and storage systems.
 * @description
 * <p> Namespace vom implements Vanadium Object Marshaling, a serialization
 * protocol.</p>
 * <p>For the concept doc see
 * {@link https://vanadium.github.io/concepts/rpc.html#vom}
 * </p>
 * <p>Vom is used in Vanadium to enable interchange of user-defined data
 * structures across networks, languages and storage systems.</p>
 *
 * <p>VOM supports the same types and compatibility rules supported by
 * [VDL]{@link module:vanadium.vdl}.  It is a self-describing wire
 * format.</p>
 */
module.exports = {
  ByteArrayMessageReader: require('./byte-array-message-reader'),
  ByteMessageWriter: require('./byte-message-writer'),
  Encoder: require('./encoder'),
  Decoder: require('./decoder'),
  encode: require('./encode'),
  decode: require('./decode'),
  TypeDecoder: require('./type-decoder'),
  TypeEncoder: require('./type-encoder')
};

require('./native-types'); // Register standard native types.
