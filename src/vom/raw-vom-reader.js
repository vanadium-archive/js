// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*global escape: true */
/**
 * @fileoverview Definition of RawVomReader.
 * @private
 */

module.exports = RawVomReader;

var BigInt = require('../vdl/big-int.js');
var BinaryReader = require('./binary-reader.js');
var ByteUtil = require('../vdl/byte-util.js');

/**
 * RawVomReader reads VOM primitive values (numbers, strings, bools) from a
 * provided Uint8Array.
 * @private
 * @param {Uint8Array} arr The array to read from.
 * @constructor
 */
function RawVomReader(arr) {
  this._reader = new BinaryReader(arr);
}

/**
 * Reads a BigUint.
 * @return {BigUint} The BigUint that was read.
 */
RawVomReader.prototype.readBigUint = function() {
  var firstByte = this._reader.readByte();
  if (firstByte <= 0x7f) {
    if (firstByte === 0) {
      return new BigInt(0, new Uint8Array(0));
    }
    return new BigInt(1, new Uint8Array([firstByte]));
  }

  var numBytes = 0x100 - firstByte;
  if (numBytes > 8 || numBytes < 1) {
    throw new Error('Invalid size ' + numBytes);
  }

  var uintBytes = this._reader.readByteArray(numBytes);
  return new BigInt(1, uintBytes);
};

/**
 * Returns a control byte if the next byte is a control byte.
 * @returns {Number} a control byte if there is one, null if there is no
 * control byte
 */
RawVomReader.prototype.tryReadControlByte = function() {
  var firstByte = this.peekByte();
  if (firstByte === null) {
    return null;
  }

  if (firstByte > 0x7f && firstByte <= 0xef) {
    return this.readByte();
  }
  return null;
};

/**
 * Reads a BigInt.
 * @return {BigInt} The BigInt that was read.
 */
RawVomReader.prototype.readBigInt = function() {
  var uint = this.readBigUint();
  var bytes = uint.getUintBytes();
  var sign;
  if (uint.getSign() === 0) {
    sign = 0;
  } else if (bytes.length > 0 && (bytes[bytes.length - 1] & 0x01) !== 0) {
    sign = -1;
  } else {
    sign = 1;
  }
  bytes = ByteUtil.shiftRightOne(bytes);
  if (sign === -1) {
    bytes = ByteUtil.increment(bytes);
  }
  return new BigInt(sign, bytes);
};

/**
 * Reads a unsigned integer as a native JavaScript number.
 * @return {number} The uint that was read.
 */
RawVomReader.prototype.readUint = function() {
  return this.readBigUint().toNativeNumber();
};

/**
 * Reads a integer as a native JavaScript number.
 * @return {number} The int that was read.
 */
RawVomReader.prototype.readInt = function() {
  return this.readBigInt().toNativeNumber();
};


/**
 * Reads a float as a native JavaScript number.
 * @return {number} The float that was read.
 */
RawVomReader.prototype.readFloat = function() {
  var uintBytes = this.readBigUint().getUintBytes();
  var arr = new Uint8Array(8);
  arr.set(uintBytes, arr.length - uintBytes.length);
  var view = new DataView(arr.buffer);
  return view.getFloat64(0, true);
};

/**
 * Reads a string.
 * @return {string} The string that was read.
 */
RawVomReader.prototype.readString = function() {
  var length = this.readUint();
  var str = '';
  for (var i = 0; i < length; i++) {
    str += String.fromCharCode(this._reader.readByte());
  }
  return decodeURIComponent(escape(str));
};

/**
 * Reads a boolean.
 * @return {boolean} The boolean that was read.
 */
RawVomReader.prototype.readBool = function() {
  var b = this._reader.readByte();
  if (b === 1) {
    return true;
  } else if (b === 0) {
    return false;
  }
  throw new Error('Invalid boolean byte ' + b);
};

/**
 * Reads a single VOM byte.
 * @return {byte} The byte that was read.
 */
RawVomReader.prototype.readByte = function() {
  return this._reader.readByte();
};

/**
 * Reads a single VOM byte without advancing the reader
 * @return {byte} The byte that was read.
 */
RawVomReader.prototype.peekByte = function() {
  return this._reader.peekByte();
};

/**
 * Reads raw bytes.
 * @param {number} amt The number of bytes to read.
 * @return {Uint8Array} The bytes that were read.
 */
RawVomReader.prototype._readRawBytes = function(amt) {
  return this._reader.readByteArray(amt);
};

RawVomReader.prototype.hasData = function() {
  return this._reader.hasData();
};
