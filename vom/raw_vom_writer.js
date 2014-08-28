/**
 * @fileoverview Definition of RawVomReader.
 */

var BigInt = require('./big_int.js');
var BinaryWriter = require('./binary_writer.js');
var ByteUtil = require('./byte_util.js');

/**
 * RawVomWriter writes VOM primitive values (numbers, strings, bools) to a
 * buffer.
 * @constructor
 */
function RawVomWriter() {
  this.writer = new BinaryWriter();
}

/**
 * Writes a BigInt as a VOM uint.
 * The BigInt must be non-negative.
 * @param {BigInt} v The value
 */
RawVomWriter.prototype._writeBigUint = function(v) {
  if (v.getSign() === -1) {
    throw new Error('Cannot write negative uint');
  }
  if (v.getSign() === 0) {
    this.writer.writeByte(0);
    return;
  }
  if (v.getUintBytes().length > 1 || v.getUintBytes()[0] > 0x7f) {
    this.writer.writeByte(0x100 - v.getUintBytes().length);
  }
  this.writer.writeByteArray(v.getUintBytes());
};

/**
 * Writes a BigInt as a VOM int.
 * @param {BigInt} v The value
 */
RawVomWriter.prototype._writeBigInt = function(v) {
  var copy = new Uint8Array(v.getUintBytes());
  if (v.getSign() === -1) {
    copy = ByteUtil.decrement(copy);
    copy = ByteUtil.shiftLeftOne(copy);
    copy[copy.length - 1] = copy[copy.length - 1] | 0x01;
  } else {
    copy = ByteUtil.shiftLeftOne(copy);
  }
  this._writeBigUint(new BigInt(Math.abs(v.getSign()), copy));
};

/**
 * Writes a value as a VOM uint.
 * @param {number | BigInt} v The value.
 */
RawVomWriter.prototype.writeUint = function(v) {
  if (typeof v === 'number') {
    v = BigInt.fromNativeNumber(v);
  }
  this._writeBigUint(v);
};

/**
 * Writes a value as a VOM int.
 * @param {number | BigInt} v The value.
 */
RawVomWriter.prototype.writeInt = function(v) {
  if (typeof v === 'number') {
    v = BigInt.fromNativeNumber(v);
  }
  this._writeBigInt(v);
};

/**
 * Writes a value as a VOM float.
 * @param {number | BigInt} v The value.
 */
RawVomWriter.prototype.writeFloat = function(v) {
  if (typeof v === 'object') {
    // BigInt.
    v = v.toNativeNumber();
  }
  var buf = new ArrayBuffer(8);
  var dataView = new DataView(buf);
  dataView.setFloat64(0, v, true);
  var bytes = new Uint8Array(buf);
  var sign = 1;
  if (ByteUtil.emptyOrAllZero(bytes)) {
    sign = 0;
  }
  this._writeBigUint(new BigInt(sign, bytes));
};

/**
 * Writes a VOM string.
 * @param {string} v The string.
 */
RawVomWriter.prototype.writeString = function(v) {
  var utf8String = unescape(encodeURIComponent(v));
  this.writeUint(utf8String.length);
  for (var i = 0; i < utf8String.length; i++) {
    this.writer.writeByte(utf8String.charCodeAt(i));
  }
};

/**
 * Writes a VOM boolean.
 * @param {boolean} v The boolean.
 */
RawVomWriter.prototype.writeBool = function(v) {
  if (v) {
    this.writer.writeByte(1);
  } else {
    this.writer.writeByte(0);
  }
};

/**
 * Gets the written bytes.
 * @return {Uint8Array} The buffered bytes.
 */
RawVomWriter.prototype.getBytes = function() {
  return new Uint8Array(this.writer.getBytes());
};

module.exports = RawVomWriter;