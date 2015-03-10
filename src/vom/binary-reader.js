/**
 * @fileoverview Definition of BinaryReader.
 * @private
 */

module.exports = BinaryReader;

/**
 * BinaryReader assists in reading from a Uint8Array by keeping track of the
 * position being read.
 * @private
 * @param {Uint8Array} The buffer to read from.
 * @constructor
 */
function BinaryReader(buf) {
  this.pos = 0;
  this.buf = buf;
}

/**
 * Reads a byte from the bufer.
 * @return {number} The byte value. EOF is represented by null.
 */
BinaryReader.prototype.readByte = function() {
  var val = this.buf[this.pos];
  this.pos++;
  if (val === undefined) {
  	throw new Error('Failed to read byte, reached end of buffer');
  }
  return val;
};

/**
 * Returns the next byte from the buffer without advancing the reader
 * @return {number} The byte value. EOF is represented by null.
 */
BinaryReader.prototype.peekByte = function() {
  var val = this.buf[this.pos];
  if (val === undefined) {
  	throw new Error('Failed to read byte, reached end of buffer');
  }
  return val;
};

/**
 * Reads an array of bytes from the buffer.
 * @param {number} amt. The number of bytes to read.
 * @return {Uint8Array} The byte array. If the whole size cannot be read, null
 * (representing EOF) is returned.
 */
BinaryReader.prototype.readByteArray = function(amt) {
  var arr = this.buf.subarray(this.pos, this.pos + amt);
  this.pos += amt;
  if (this.pos > this.buf) {
  	throw new Error('Failed to read ' + amt + ' bytes. Hit EOF.');
  }
  return arr;
};
