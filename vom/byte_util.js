/**
 * @fileoverview Utilities for manipulating bytes.
 */

 module.exports = {
  emptyOrAllZero: emptyOrAllZero,
  allOne: allOne,
  shiftLeftOne: shiftLeftOne,
  shiftRightOne: shiftRightOne,
  decrement: decrement,
  increment: increment,
  bytes2Hex: bytes2Hex,
  hex2Bytes: hex2Bytes
};

/**
 * Checks if the array of bytes is all zero or empty.
 * @param {Uint8Array} bytes the input byte array.
 * @return {boolean} true if the array is all zero or empty. false otherwise.
 */
function emptyOrAllZero(bytes) {
  for (var i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0x00) {
      return false;
    }
  }
  return true;
};

/**
 * Checks if the array of bytes is all one bits (0xff bytes).
 * @param {Uint8Array} bytes the input byte array.
 * @return {boolean} true if the array is all one. false otherwise.
 */
function allOne(bytes) {
  if (bytes.length === 0) {
    return false;
  }
  for (var i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0xff) {
      return false;
    }
  }
  return true;
};

/**
 * Shifts the bytes to the left by one bit.
 * This may mutate the input array.
 * @param {Uint8Array} bytes the input byte array.
 * @return the left shifted byte array.
 */
function shiftLeftOne(bytes) {
  if (emptyOrAllZero(bytes)) {
    return bytes;
  }
  if ((bytes[0] & 0x80) !== 0) {
    // Expand the array because the shift will lose the upper bit.
    var largerArray = new Uint8Array(bytes.length + 1);
    largerArray.set(bytes, 1);
    bytes = largerArray;
  }
  for (var i = 0; i < bytes.length - 1; i++) {
    var val = bytes[i] << 1;
    val = val | (bytes[i + 1] & 0x80) >>> 7;
    bytes[i] = val;
  }
  bytes[bytes.length - 1] = bytes[bytes.length - 1] << 1;
  return bytes;
};

/**
 * Shifts the bytes to the right by one bit.
 * This mutates the input array.
 * @param {Uint8Array} bytes the input byte array.
 * @return the right shifted byte array.
 */
function shiftRightOne(bytes) {
  var topBit = 0;
  for (var i = 0; i < bytes.length; i++) {
    var nextTopBit = (bytes[i] & 0x01) << 7;
    bytes[i] = (bytes[i] >>> 1) | topBit;
    topBit = nextTopBit;
  }
  return bytes;
};

/**
 * Decrements the input byte array by 1.
 * This mutates the input array.
 * @param {Uint8Array} bytes the input byte array.
 * @return the decremented byte array.
 */
function decrement(bytes) {
  if (emptyOrAllZero(bytes)) {
    throw new Error('Decrement of zero not supported');
  }
  for (var i = bytes.length - 1; i >= 0; i--) {
    if (bytes[i] === 0) {
      bytes[i] = 0xff;
    } else {
      bytes[i] = bytes[i] - 1;
      break;
    }
  }
  return bytes;
};

/**
 * Increments the input byte array by 1.
 * This mutates the input array.
 * @param {Uint8Array} bytes the input byte array.
 * @return the incremented byte array.
 */
function increment(bytes) {
  if (bytes.length === 0) {
    return new Uint8Array([0x01]);
  }
  if (allOne(bytes)) {
    // Expand the array because the shift will lose the upper bit.
    var largerArray = new Uint8Array(bytes.length + 1);
    largerArray.set(bytes, 1);
    bytes = largerArray;
  }
  for (var i = bytes.length - 1; i >= 0; i--) {
    if (bytes[i] === 0xff) {
      bytes[i] = 0x00;
    } else {
      bytes[i] = bytes[i] + 1;
      break;
    }
  }
  return bytes;
};

/**
 * Converts the input byte array to a hex representation.
 * @param {Uint8Array} bytes the input byte array.
 * @return {string} a hex string representation of the input array.
 */
function bytes2Hex(arr) {
  var hexString = '';
  for (var i = 0; i < arr.length; i++) {
    var str = arr[i].toString(16);
    if (str.length === 1) {
      str = '0' + str;
    }
    hexString += str;
  }
  return hexString;
};

/**
 * Converts the input hex string to a byte array.
 * @param {string} hexString the input hex string.
 * @return {Uint8Array} the byte array representation of the hex string.
 */
function hex2Bytes(hexString) {
  if (hexString.length % 2 !== 0) {
    throw new Error('Even length string required.');
  }
  var arr = new Uint8Array(hexString.length / 2);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hexString.substring(i*2, (i+1)*2), 16);
  }
  return arr;
};