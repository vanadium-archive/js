/**
 * @fileoverview Helper functions to get random values.
 * @private
 */

var Buffer = require('buffer').Buffer;
var isBrowser = require('is-browser');

module.exports = {
  int32: int32,
  hex: hex
};

var crypto;

// This will use window.crypto in browser, and node's crypto library in node.
function randomBytes(len) {
  len = len || 1;
  if (isBrowser) {
    var array = new Int8Array(len);
    window.crypto.getRandomValues(array);
    return new Buffer(array);
  }

  // Lazily load crypto library.  We use an expression in argument to require so
  // browserify won't automatically bundle large crypto library.
  crypto = crypto || require('crypt' + 'o');
  return crypto.randomBytes(len);
}

function int32() {
  return randomBytes(4).readInt32BE(0);
}

function hex(len) {
  len = len || 16;
  return randomBytes(Math.ceil(len/2)).toString('hex').substr(0, len);
}
