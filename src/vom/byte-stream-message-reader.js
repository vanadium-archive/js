// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a read stream of VOM messages backed by a byte
 * array.
 * @private
 */

module.exports = ByteStreamMessageReader;

var ByteMessageReader = require('./byte-message-reader.js');
var StreamReader = require('./stream-reader.js');
var RawVomReader = require('./raw-vom-reader.js');
var inherits = require('inherits');

/**
 * Create a VOM message reader backed by a byte stream.
 * @constructor
 * @memberof module:vanadium.vom
 */
function ByteStreamMessageReader() {
  this._streamReader = new StreamReader();
  ByteMessageReader.call(this, new RawVomReader(this._streamReader));
}

inherits(ByteStreamMessageReader, ByteMessageReader);

ByteStreamMessageReader.prototype.addBytes = function(bytes) {
  this._streamReader.addBytes(bytes);
};
