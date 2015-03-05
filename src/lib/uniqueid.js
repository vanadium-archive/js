/**
 * @fileoverview A package to generate uniqueids based on random numbers.
 *
 * @private
 */

var typeutil = require('../vdl/type-util');
var vdl = require('../gen-vdl/v.io/v23/uniqueid');
var byteUtil = require('../vdl/byte-util');

var currentRandom;
var currentSequence = 0;

/**
 * Generate a new random uniqueid.Id.
 * @return {Object} A new random uniqueid.Id.
 */
function random() {
  var out = new vdl.Id();
  var val = typeutil.unwrap(out);

  if (currentSequence === 0) {
    currentRandom = new Uint8Array(14);
    for (var j = 0; j < 14; j++) {
      currentRandom[j] = Math.floor(Math.random() * 256);
    }
  }
  for (var i = 0; i < 14; i++) {
    val[i] = currentRandom[i];
  }
  val[14] = ((currentSequence >> 8) & 0x7f) | 0x80;
  val[15] = currentSequence & 0xff;
  currentSequence = (currentSequence + 1) & 0x7fff;
  return out;
}

/**
 * Returns true if the given uniqueid.Id is valid.
 * @param {Object} A uniqueid.Id instance.
 * @return {bool} true if the given uniqueid.Id is valid.
 */
function valid(id) {
  id = typeutil.unwrap(id);
  if (!id || id.length < 16) {
    return false;
  }
  for (var i = 0; i < 16; i++) {
    if (id[i] !== 0) {
      return true;
    }
  }
  return false;
}

/**
 * Returns a hexidecimal string representation of the given uniqueid.Id.
 * @param {Object} id A uniqueid.Id instance.
 * @return {string} A hexidecimal string.
 */
function toHexString(id) {
  return byteUtil.bytes2Hex(typeutil.unwrap(id));
}

/**
 * Creates a uniqeid.Id instance from its hexidecimal string representation.
 * @param {string} s A hexidecimal string.
 * @return {Object} A uniqueid.Id instance.
 */
function fromHexString(s) {
  return new vdl.Id(byteUtil.hex2Bytes(s));
}

module.exports = {
  random: random,
  valid: valid,
  toHexString: toHexString,
  fromHexString: fromHexString
};
