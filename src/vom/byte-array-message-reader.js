// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a read stream of VOM messages backed by a byte
 * array.
 * @private
 */

module.exports = ByteArrayMessageReader;

var RawVomReader = require('./raw-vom-reader.js');
var ByteMessageReader = require('./byte-message-reader.js');
var inherits = require('inherits');

/**
 * Create a VOM message reader backed by a byte array.
 * @param {Uint8Array} bytes The byte array.
 * @constructor
 * @memberof module:vanadium.vom
 */
function ByteArrayMessageReader(bytes) {
 ByteMessageReader.call(this, new RawVomReader(bytes));
}

inherits(ByteArrayMessageReader, ByteMessageReader);
