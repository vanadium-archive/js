/**
 * @fileoverview Helper functions to get random values.
 */

// This will use window.crypto in browser, and node's crypto library in node.
var crypto = require('crypto');

module.exports = {
  int32: int32,
  hex: hex
};

function int32() {
  return crypto.randomBytes(4).readInt32BE(0);
}

function hex(len) {
  len = len || 16;
  return crypto.randomBytes(len/2).toString('hex');
}
