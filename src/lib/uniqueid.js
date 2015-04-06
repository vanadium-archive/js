// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A package to generate uniqueids based on random numbers.
 *
 * @private
 */

/**
 * @summary Namespace uniqueId defines functions that are likely to generate
 * globally unique identifiers.
 * @description <p>Namespace uniqueId defines functions that are likely to
 * generate globally unique identifiers. We want to be able to generate many
 * Ids quickly, so we make a time/space tradeoff. We reuse the same random data
 * many times with a counter appended. Note: these Ids are NOT useful as a
 * security mechanism as they will be predictable.</p>
 * @namespace
 * @name uniqueId
 * @memberof module:vanadium
 */

var typeutil = require('../vdl/type-util');
var vdl = require('../gen-vdl/v.io/v23/uniqueid');
var byteUtil = require('../vdl/byte-util');

var currentRandom;
var currentSequence = 0;

/**
 * Generate a new random uniqueId.Id.
 * @return {module:vanadium.uniqueId.Id} A new random uniqueId.Id.
 * @memberof module:vanadium.uniqueId
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
 * @param {module:vanadium.uniqueId.Id} A uniqueId.Id instance.
 * @return {bool} true if the given uniqueId.Id is valid.
 * @memberof module:vanadium.uniqueId
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
 * @param {module:vanadium.uniqueId.Id} id A uniqueId.Id instance.
 * @return {string} A hexidecimal string.
 * @memberof module:vanadium.uniqueId
 */
function toHexString(id) {
  return byteUtil.bytes2Hex(typeutil.unwrap(id));
}

/**
 * Creates a uniqeid.Id instance from its hexidecimal string representation.
 * @param {string} s A hexidecimal string.
 * @return {module:vanadium.uniqueId.Id} A uniqueId.Id instance.
 * @memberof module:vanadium.uniqueId
 */
function fromHexString(s) {
  return new vdl.Id(byteUtil.hex2Bytes(s));
}

module.exports = {
  random: random,
  valid: valid,
  toHexString: toHexString,
  fromHexString: fromHexString,
  /**
   * @summary An Id is a likely globally unique identifier.
   * @description
   * <p>An Id is a likely globally unique identifier.</p>
   * <p>Use [random]{@link module:vanadium.uniqueId.random} to
   * create a new one</p>
   * @name Id
   * @param {Uint8Array} bytes 16-byte array
   * @constructor
   * @memberof module:vanadium.uniqueId
   */
  Id: vdl
};
