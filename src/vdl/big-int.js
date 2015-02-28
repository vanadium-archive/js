/**
 * @fileoverview Definition of BigInt.
 */

var ByteUtil = require('./byte-util.js');

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
  this._bytes = new Uint8Array(trimBytes(uintBytes)); // Copy trimmed bytes.
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

function trimBytes(bytes) {
  var i = 0;
  for (; i < bytes.length; i++) {
    if (bytes[i] !== 0) {
      break;
    }
  }
  return bytes.subarray(i);
}

/**
 * Create a BigInt from a native JavaScript number.
 * @param {number} val A native JavaScript value.
 * @throws {Error} If value cannot be represented as a BigInt.
 * @return {BigInt} The BigInt representation.
 */
BigInt.fromNativeNumber = function(val) {
  if (val !== parseInt(val)) {
    throw new Error('From number can only convert integer values (failing ' +
      'on ' + val + ')');
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
 * JavaScript integer (for the range of valid JavaScript integers).
 * @return {string} The string representation.
 */
BigInt.prototype.toString = function() {
  if (this._sign === 0) {
    return '0';
  }
  var val = this;
  var str = '';
  if (this._sign === -1) {
    val = this.negate();
    str = '-';
  }
  var ten = new BigInt(1, new Uint8Array([10]));
  var powerTen = new BigInt(1, new Uint8Array([0x01]));
  while (val.greaterThan(powerTen)) {
    powerTen = powerTen.multiply(ten);
  }
  // now powerTen >= val
  var outputtedNonzeroVal = false;
  while (powerTen._sign !== 0) {
    var amt = val.divide(powerTen);
    var nat = amt.toNativeNumber();
    if (nat !== 0) {
      str += nat.toString();
      outputtedNonzeroVal = true;
    } else if (outputtedNonzeroVal) {
      str += '0';
    }
    var subtractOff = powerTen.multiply(amt);
    val = val.subtract(subtractOff);
    powerTen = powerTen.divide(ten);
  }
  return str;
};

/**
 * Compares BigInt objects.
 * @return {boolean} True if this BigInt is greater than the passed in BigInt.
 */
BigInt.prototype.greaterThan = function(other) {
  if (this._sign !== other._sign) {
    return this._sign > other._sign;
  }
  if (this._sign === 0) {
    return false;
  }
  if (this._bytes.length !== other._bytes.length) {
    return ((this._bytes.length - other._bytes.length) * this._sign) > 0;
  }
  for (var i = 0; i < this._bytes.length; i++) {
    if (this._bytes[i] > other._bytes[i]) {
      return this._sign > 0;
    }
    if (other._bytes[i] > this._bytes[i]) {
      return this._sign < 0;
    }
  }
  return false;
};

/**
 * Compares BigInt objects.
 * @return {boolean} True if this BigInt is greater than or equal to the passed
 * in BigInt.
 */
BigInt.prototype.greaterThanEquals = function(other) {
  return this.greaterThan(other) || this.equals(other);
};

/**
 * Subtracts one BigInt from another.
 * @param {BigInt} other The value to subtract from this BigInt.
 * @return {BigInt} Returns a new BigInt equal to this - other.
 */
BigInt.prototype.subtract = function(other) {
  if (this._sign === 0) {
    return other.negate();
  }
  if (other._sign === 0) {
    return this;
  }
  if (this._sign === 1 && other._sign === -1) {
    return this.add(other.negate());
  }
  if (this._sign === -1 && other._sign === 1) {
    return other.add(this.negate()).negate();
  }

  var firstGeq = this.greaterThanEquals(other);
  var sign;
  if (firstGeq) {
    if (this.greaterThan(other)) {
      sign = 1;
    } else {
      sign = 0;
    }
  } else {
    sign = -1;
  }

  var greaterBytes = this._bytes;
  var lessBytes = other._bytes;
  if ((firstGeq && this._sign === -1) || (!firstGeq && this._sign === 1)) {
    greaterBytes = other._bytes;
    lessBytes = this._bytes;
  }

  var outArr = new Uint8Array(greaterBytes.length);

  var carry = 0;
  for (var place = 0; place < outArr.length; place++) {
    var outArrIndex = outArr.length - place - 1;
    var greaterIndex = greaterBytes.length - place - 1;
    var lessIndex = lessBytes.length - place - 1;

    var total = carry;
    if (greaterIndex >= 0) {
      total += greaterBytes[greaterIndex];
    }
    if (lessIndex >= 0) {
      total -= lessBytes[lessIndex];
    }
    if (total < 0) {
      carry = -1;
      total += 256;
    } else {
      carry = 0;
    }

    outArr[outArrIndex] = total;
  }

  return new BigInt(sign, outArr);
};

/**
 * Adds two BigInts together.
 * @param {BigInt} other The BigInt to add to this BigInt.
 * @return {BigInt} A new BigInt equal to this + other.
 */
BigInt.prototype.add = function(other) {
  if (this._sign === 0) {
    return other;
  }
  if (other._sign === 0) {
    return this;
  }
  if (this._sign === 1 && other._sign === -1) {
    return this.subtract(other.negate());
  }
  if (this._sign === -1 && other._sign === 1) {
    return other.subtract(this.negate());
  }

  var numBytesNeeded = Math.max(this._bytes.length, other._bytes.length);
  var outArr = new Uint8Array(numBytesNeeded);

  var carry = 0;
  for (var place = 0; place < outArr.length; place++) {
    var outArrIndex = outArr.length - place - 1;
    var thisIndex = this._bytes.length - place - 1;
    var otherIndex = other._bytes.length - place - 1;

    var total = carry;
    if (thisIndex >= 0) {
      total += this._bytes[thisIndex];
    }
    if (otherIndex >= 0) {
      total += other._bytes[otherIndex];
    }
    if (total >= 256) {
      carry = 1;
      total -= 256;
    } else {
      carry = 0;
    }

    outArr[outArrIndex] = total;
  }

  if (carry === 1) {
    var newArr = new Uint8Array(numBytesNeeded + 1);
    newArr.set(outArr, 1);
    newArr[0] = 0x01;
    outArr = newArr;
  }

  return new BigInt(this._sign, outArr);
};

/**
 * Multiplies BigInts
 * @param {BigInt} other The BigInt to multiply with this BigInt.
 * @return {BigInt} A new BigInt equal to this * other.
 */
BigInt.prototype.multiply = function(other) {
  var total = new BigInt(0, new Uint8Array());
  for (var b = 0; b < this._bytes.length; b++) {
    var byteVal = this._bytes[b];
    for (var i = 0; i < 8; i++) {
      if ((byteVal & (1 << i)) !== 0) {
        var bit = i + (this._bytes.length - b - 1) * 8;
        var shiftedVal = other.leftShift(bit);
        total = total.add(shiftedVal);
      }
    }
  }
  if (this._sign === -1) {
    return total.negate();
  }
  return total;
};

/**
 * Divides BigInts
 * @param {BigInt} divisor The BigInt to use as the divisor.
 * @return {BigInt} a new BigInt equalt to this / divisor.
 */
BigInt.prototype.divide = function(divisor) {
  if (divisor._sign === 0) {
    return NaN;
  }
  if (divisor.abs().greaterThan(this.abs())) {
    return new BigInt(0, new Uint8Array());
  }
  var absDivisor = divisor.abs();
  var result = new Uint8Array(this._bytes.length);
  var remainder = new BigInt(0, new Uint8Array());
  for (var i = 0; i < this._bytes.length; i++) {
    for (var b = 7; b >= 0; b--) {
      remainder = remainder.leftShift(1);
      if ((this._bytes[i] & (1 << b)) !== 0) {
        remainder = remainder.add(new BigInt(1, new Uint8Array([1])));
      }
      if (remainder.greaterThanEquals(absDivisor)) {
        result[i] |= 1 << b;
        remainder = remainder.subtract(absDivisor);
      }
    }
  }

  return new BigInt(this._sign * divisor._sign, result);
};

/**
 * Negates the BigInt.
 * @return {BigInt} A new BigInt that is a negated version the BigInt.
 */
BigInt.prototype.negate = function() {
  return new BigInt(-this._sign, this._bytes);
};

/**
 * Takes the absolute value.
 * @return {BigInt} A new BigInt equal to the absolute value of this BigInt.
 */
BigInt.prototype.abs = function() {
  return new BigInt(Math.abs(this._sign), this._bytes);
};

function mostSignificantBitForByte(b) {
  var count = 0;
  if (b >= 0x10) {
    count += 4;
    b >>= 4;
  }
  if (b >= 0x04) {
    count += 2;
    b >>= 2;
  }
  if (b >= 0x02) {
    count += 1;
  }
  return count;
}

/**
 * Performs left shift of an arbitrary amount.
 * @param {amt} The amount to shift in bits.
 * @return {BigInt} A new BigInt that is left shifted by the specified amount.
 */
BigInt.prototype.leftShift = function(amt) {
  if (this._bytes.length === 0) {
    return this;
  }
  var spaceRemaining = 7 - mostSignificantBitForByte(this._bytes[0]);
  var extraSpaceNeeded = Math.ceil((amt - spaceRemaining) / 8);
  var spaceNeeded = extraSpaceNeeded + this._bytes.length;
  var result = new Uint8Array(spaceNeeded);

  var bitOffset = amt % 8;
  if (bitOffset === 0) {
    result.set(this._bytes);
  } else {
    var highLeftShift = bitOffset;
    var highMask = (1 << (8 - bitOffset)) - 1;
    var lowRightShift = 8 - bitOffset;
    var extraOffset = 0;
    if ((this._bytes[0] >> lowRightShift) > 0) {
      extraOffset = 1;
    }

    for (var i = 0; i < this._bytes.length; i++) {
      var b = this._bytes[i];
      if (i + extraOffset > 0) {
        result[i + extraOffset - 1] |= b >> lowRightShift;
      }
      result[i + extraOffset] |= ((b & highMask) << highLeftShift);
    }
  }
  return new BigInt(this._sign, result);
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
 * Convert to a native JavaScript float64 representation.
 * @throws {Error} if the value cannot be converted to a float64 without loss.
 * @return {number} a native JavaScript float64 representation of the BigInt.
 */
BigInt.prototype.toNativeNumber = function() {
  if (this._largerThanMaxLosslessInteger()) {
    throw new Error('BigInt \'' + ByteUtil.bytes2Hex(this) +
      '\' out of range of native JavaScript numbers');
  }
  return this._convertToNative();
};

/**
 * Approximate the native JavaScript float64 representation.
 * Caution: The conversion is not accurate when the BigInt is larger than the
 * maximum lossless integer.
 * @return {number} a native JavaScript float64 representation of the BigInt.
 */
BigInt.prototype.toNativeNumberApprox = function() {
  return this._convertToNative();
};

/**
 * @return {number} a native JavaScript float64 representation of the BigInt.
 */
BigInt.prototype._convertToNative = function() {
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
  var arr2 = new Uint8Array(4);
  arr2.set(this._bytes.subarray(copySrcIndex, copySrcIndex + copyableLength),
    copyDstIndex);
  var view2 = new DataView(arr2.buffer);
  var upperVal = view2.getUint32(0, false);
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
