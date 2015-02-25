/**
 * @fileoverview Helper functions to get random values.
 * @private
 */

// This will use window.crypto in browser, and node's crypto library in node.
var randomBytes = require('randombytes');

module.exports = {
  int32: int32,
  hex: hex
};

function int32() {
  return randomBytes(4).readInt32BE(0);
}

function hex(len) {
  len = len || 16;
  return randomBytes(Math.ceil(len/2)).toString('hex').substr(0, len);
}
