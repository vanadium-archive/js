/**
 * @fileoverview Definition of BigInt.
 */

var ByteUtil = require('./byte_util.js');

module.exports = BigInt;

/**
 * BigInt represents an integer value of arbitrary size.
 * @param {number} sign The sign of the number 1, -1 or 0.
 * @param {Uint8Array} uintBytes The backing byte array, in network byte order.
 * @constructor
 */
function BigInt(sign, uintBytes) {
  this._sign = sign;
  // Remove uppermost zero bytes.
  var i = 0;
  for (; i < uintBytes.length; i++) {
    if (uintBytes[i] !== 0) {
      break;
    }
  }
  this._bytes = uintBytes.subarray(i); // NOTE: This doesn't copy.
  Object.freeze(this);

  if (sign === 0 && this._bytes.length !== 0) {
    throw new Error('Sign is zero, but non-zero bytes \'' +
      ByteUtil.bytes2Hex(this._bytes) + '\' passed to constructor.');
  } else if (sign !== 0 && this._bytes.length === 0) {
    throw new Error('Non-zero sign ' + sign +
      ', but zero bytes passed to constructor.');
  } else if (sign !== 1 && sign !== -1 && sign !== 0) {
    throw new Error('sign ' + sign + ' not supported.');
  }
}

/**
 * Create a BigInt from a native javascript number.
 * @param {number} val A native javascript value.
 * @throws {Error} If value cannot be represented as a BigInt.
 * @return {BigInt} The BigInt representation.
 */
BigInt.fromNativeNumber = function(val) {
  if (val !== parseInt(val)) {
    throw new Error('From number can only convert integer values');
  }
  if (val > 9007199254740992 || val < -9007199254740992) {
    throw new Error('Cannot convert 0x' + val.toString(16) + ' to big int. ' +
      'Integers outside of (-2^53, 2^53)');
  }
  if (val === 0) {
    return new BigInt(0, new Uint8Array(0));
  }
  var abs = Math.abs(val);
  if (abs <= 0xffffffff) {
    var lowerByteArr = new Uint8Array(4);
    var dataView = new DataView(lowerByteArr.buffer);
    dataView.setUint32(0, abs, false);
    return new BigInt(_sign(val), lowerByteArr);
  }
  var upperVal = abs / 0x100000000;
  var lowerVal = abs % 0x100000000;
  var upperByteArr = new Uint8Array(8);
  var upperDataView = new DataView(upperByteArr.buffer);
  upperDataView.setUint32(4, lowerVal, false);
  upperDataView.setUint32(0, upperVal, false);
  return new BigInt(_sign(val), upperByteArr);
};

/**
 * Generate a string representation of the BigInt.
 * This must have the same output format as the string conversion of normal
 * javascript integer (for the range of valid javascript integers).
 * @return {string} The string representation.
 */
BigInt.prototype.toString = function() {
  try {
    return this.toNativeNumber().toString();
  } catch (e) {
    // TODO(bprosnitz) Make the format consistent for the full number range.
    return 'BigInt with value \'' +
      ByteUtil.bytes2Hex(this._bytes) + '\' too large for toString impl.';
  }
};

/**
 * Determine if this BigInt is equal to another BigInt.
 *
 * @param {BigInt} other The other BigInt to compare.
 * @return {boolean} true if this BigInt is equal to the other BigInt. false
 * otherwise.
 */
BigInt.prototype.equals = function(other) {
  if (this.getSign() !== other.getSign()) {
    return false;
  }

  var thisBytes = this.getUintBytes();
  var otherBytes = other.getUintBytes();

  if (thisBytes.length !== otherBytes.length) {
    return false;
  }
  for (var i = 0; i < thisBytes.length; i++) {
    if (thisBytes[i] !== otherBytes[i]) {
      return false;
    }
  }
  return true;
};

/**
 * Gets the sign of this BigInt.
 * @return {sign} 1 if positive, 0 if zero, -1 if negative.
 */
BigInt.prototype.getSign = function() {
  return this._sign;
};

/**
 * Gets the uint byte value of this big int.
 * This method trims upper zero bytes.
 * @return {Uint8Array} The uint bytes.
 */
BigInt.prototype.getUintBytes = function() {
  return this._bytes;
};

/**
 * Convert to a native javascript float64 representation.
 * @throws {Error} if the value cannot be converted to a float64 without loss.
 * @return {number} a native javascript float64 representation of the BigInt.
 */
BigInt.prototype.toNativeNumber = function() {
  if (this._largerThanMaxLosslessInteger()) {
    throw new Error('BigInt \'' + ByteUtil.bytes2Hex(this) +
      '\' out of range of native javascript numbers');
  }
  var arr = new Uint8Array(4);
  var copySrcIndex = this._bytes.length - Math.min(this._bytes.length, 4);
  var copyDstIndex = Math.max(4 - this._bytes.length, 0);
  arr.set(this._bytes.subarray(copySrcIndex), copyDstIndex);
  var view = new DataView(arr.buffer);
  var lowerVal = view.getUint32(0, false);
  if (this._bytes.length <= 4) {
    return this._sign * lowerVal;
  }
  copySrcIndex = this._bytes.length - Math.min(this._bytes.length, 8);
  copyDstIndex = Math.max(8 - this._bytes.length, 0);
  var copyableLength = Math.min(this._bytes.length - 4, 4);
  arr.set(this._bytes.subarray(copySrcIndex, copySrcIndex + copyableLength),
    copyDstIndex);
  var upperVal = view.getUint32(0, false);
  var combinedVal = upperVal * 0x100000000 + lowerVal;
  return this._sign * combinedVal;
};

/**
 * @return true if abs(this) > 2^53, false otherwise.
 */
BigInt.prototype._largerThanMaxLosslessInteger = function() {
  if (this._bytes.length >= 8) {
    return true;
  }
  if (this._bytes.length <= 6) {
    return false;
  }
  if (this._bytes[0] > 0x20) {
    return true;
  }

  if (this._bytes[0] === 0x20) {
    for (var i = 1; i <= 6; i++) {
      if (this._bytes[i] !== 0) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Get the sign of the value.
 * @param {number} val input value
 * @return {number} 1, -1, 0 depending on the sign of the input
 */
function _sign(val) {
  if (val > 0) {
    return 1;
  } else if (val < 0) {
    return -1;
  }
  return 0;
}