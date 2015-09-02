// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Definition of BinaryReader.
 * @private
 */

var Promise = require('../lib/promise');
var byteUtil = require('../vdl/byte-util');
module.exports = BinaryReader;

/**
 * BinaryReader assists in reading from a Uint8Array by keeping track of the
 * position being read.
 * @private
 * @param {Uint8Array} The buffer to read from.
 * @constructor
 */
function BinaryReader(buf) {
  this.pos = 0;
  this.buf = buf;
}

/**
 * Reads a byte from the bufer.
 * @return {Promise<number>} The byte value. EOF is represented by null.
 */
BinaryReader.prototype.readByte = function() {
  var val = this.buf[this.pos];
  this.pos++;
  if (val === undefined) {
    return Promise.reject(
      new Error('Failed to read byte, reached end of buffer'));
  }
  return Promise.resolve(val);
};

/**
 * Returns the next byte from the buffer without advancing the reader
 * @return {Promise<number>} The byte value. EOF is represented by null.
 */
BinaryReader.prototype.peekByte = function() {
  var val = this.buf[this.pos];
  if (val === undefined) {
    return Promise.reject(
      new Error('Failed to read byte, reached end of buffer'));
  }
  return Promise.resolve(val);
};

/**
 * Reads an array of bytes from the buffer.
 * @param {number} amt. The number of bytes to read.
 * @return {Promise<Uint8Array>} The byte array. If the whole size cannot be
 * read, null (representing EOF) is returned.
 */
BinaryReader.prototype.readByteArray = function(amt) {
  var arr = this.buf.subarray(this.pos, this.pos + amt);
  this.pos += amt;
  if (this.pos > this.buf.length) {
    return Promise.reject(
      new Error('Failed to read ' + amt + ' bytes. Hit EOF.'));
  }
  return Promise.resolve(arr);
};

BinaryReader.prototype.hasData = function() {
  return this.pos < this.buf.length;
};

BinaryReader.prototype.getHexBytes = function() {
  return byteUtil.bytes2Hex(this.buf.slice(this.pos));
};
