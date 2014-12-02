/**
 * @fileoverview Helper functions to get random values.
 */

module.exports = {
  integer: integer,
  string: string
};

// NOTE: This is the maximum integer size that NaCl can handle, not the maximum
// JS integer size.
var MAX_INT = 2147483647;

function integer(max) {
  max = max || MAX_INT;
  return parseInt(Math.random() * max);
}

function string(len) {
  return Math.random().toString(36).substr(2, len);
}
