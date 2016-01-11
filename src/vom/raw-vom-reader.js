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
var versions = require('./versions.js');

/**
 * RawVomReader reads VOM primitive values (numbers, strings, bools) from a
 * provided Uint8Array.
 * @private
 * @param {Uint8Array|StreamReader} arr The array to read from.
 * @param {number} version vom version (e.g. 0x80, 0x81, ...)
 * @constructor
 */
function RawVomReader(arr) {
  if (arr instanceof Uint8Array) {
    this._reader = new BinaryReader(arr);
  } else {
    this._reader = arr;
  }
}

/**
 * Reads a uint as a BigInt.
 * @return {Promise<BigInt>} The BigUint that was read.
 */
RawVomReader.prototype.readBigUint = function() {
  var reader = this;
  return this._reader.readByte().then(function(firstByte) {
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

    return reader._reader.readByteArray(numBytes).then(function(uintBytes) {
      return new BigInt(1, uintBytes);
    });
  });
};

/**
 * Returns a control byte if the next byte is a control byte.
 * @returns {Promise<number>} a control byte if there is one, null if there
 * is no control byte.
 */
RawVomReader.prototype.tryReadControlByte = function() {
  var reader = this;
  return this.peekByte().then(function(firstByte) {
    if (firstByte === null) {
      return null;
    }

    if (firstByte > 0x7f && firstByte <= 0xef) {
      return reader._reader.readByte();
    }
    return null;
  });
};

/**
 * Reads a BigInt.
 * @return {Promise<BigInt>} The BigInt that was read.
 */
RawVomReader.prototype.readBigInt = function() {
  return this.readBigUint().then(function(uint) {
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
  });
};

/**
 * Reads a unsigned integer as a native JavaScript number.
 * @return {Promise<number>} The uint that was read.
 */
RawVomReader.prototype.readUint = function() {
  return this.readBigUint().then(function(uint) {
    return uint.toNativeNumber();
  });
};

/**
 * Reads a integer as a native JavaScript number.
 * @return {Promise<number>} The int that was read.
 */
RawVomReader.prototype.readInt = function() {
  return this.readBigInt().then(function(uint) {
    return uint.toNativeNumber();
  });
};


/**
 * Reads a float as a native JavaScript number.
 * @return {Promise<number>} The float that was read.
 */
RawVomReader.prototype.readFloat = function() {
  return this.readBigUint().then(function (bigInt) {
    var uintBytes = bigInt.getUintBytes();
    var arr = new Uint8Array(8);
    arr.set(uintBytes, arr.length - uintBytes.length);
    var view = new DataView(arr.buffer);
    return view.getFloat64(0, true);
  });
};

/**
 * Reads a string.
 * @return {Promise<string>} The string that was read.
 */
RawVomReader.prototype.readString = function() {
  var reader = this;
  return this.readUint().then(function(length) {
    return reader._reader.readByteArray(length);
   }).then(function(bytes) {
     var str = '';
     for (var i = 0; i < bytes.length; i++) {
       str += String.fromCharCode(bytes[i]);
     }
     return decodeURIComponent(escape(str));
   });
};

/**
 * Reads a boolean.
 * @return {Promise<boolean>} The boolean that was read.
 */
RawVomReader.prototype.readBool = function() {
  return this.readByte().then(function(b) {
    if (b === 1) {
      return true;
    } else if (b === 0) {
      return false;
    }

    throw new Error('Invalid boolean byte ' + b);
  });
};

/**
 * Reads a single VOM byte.
 * @return {Promise<byte>} The byte that was read.
 */
RawVomReader.prototype.readByte = function() {
  var rawReader = this;
  return this._version.then(function (version) {
    if (version === versions.version80) {
      return rawReader._reader.readByte();
    } else {
      return rawReader.readUint();
    }
  });
};

/**
 * Reads a single VOM byte.
 * @return {Promise<byte>} The byte that was read.
 */
RawVomReader.prototype.readVersionByte = function() {
    this._version = this._reader.readByte();
    return this._version;
};

/**
 * Reads a single VOM byte without advancing the reader
 * @return {Promise<number>} The byte that was read.
 */
RawVomReader.prototype.peekByte = function() {
  // NOTE: this reads a byte rather than a uint because it is used
  // for checking for flags.
  return this._reader.peekByte();
};

/**
 * Reads raw bytes.
 * @param {number} amt The number of bytes to read.
 * @return {Promise<Uint8Array>} The bytes that were read.
 */
RawVomReader.prototype._readRawBytes = function(amt) {
  return this._reader.readByteArray(amt);
};

RawVomReader.prototype.hasData = function() {
  return this._reader.hasData();
};
