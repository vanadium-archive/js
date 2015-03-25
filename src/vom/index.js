// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = {
  ByteArrayMessageReader: require('./byte-array-message-reader'),
  ByteArrayMessageWriter: require('./byte-array-message-writer'),
  Encoder: require('./encoder'),
  Decoder: require('./decoder'),
  encode: require('./encode'),
  decode: require('./decode')
};

require('./native-types'); // Register standard native types.
