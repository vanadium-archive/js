/**
 * @fileoverview Definition of BinaryWriter.
 * @private
 */

module.exports = BinaryWriter;

var INITIAL_SIZE = 64;

/**
 * BinaryWriter assists in writing to a Uint8Array by expanding the buffer to
 * the necessary size and keeping track of the current write position.
 * @private
 * @constructor
 */
function BinaryWriter() {
  this.allocatedSize = INITIAL_SIZE;
  this.pos = 0;
  this.buf = new Uint8Array(this.allocatedSize);
}

/**
 * Ensures there is enough space for a write of the specified size in the
 * backing array.
 * This has the side effect of consuming the specified number of bytes from the
 * array so that they can no longer be used for future writes.
 * @param {number} amt The number of bytes that are needed for the next write.
 * @return {number} The position in the backing array to write to.
 */
BinaryWriter.prototype._reserve = function(amt) {
  var pos = this.pos;
  var amtNeeded = this.pos + amt;

  // Expand the buffer as much as necessary.
  var expand = getMinPowerOfTwo(this.allocatedSize, amtNeeded);
  if (expand > 1) {
    this.allocatedSize = this.allocatedSize * expand;
    var newBuf = new Uint8Array(this.allocatedSize);
    newBuf.set(this.buf);
    this.buf = newBuf;
  }

  this.pos += amt;
  return pos;
};

/**
 * Writes a byte to the backing Uint8Array.
 * @param {number} val The value of the byte to write.
 */
BinaryWriter.prototype.writeByte = function(val) {
  var pos = this._reserve(1);
  this.buf[pos] = val;
};

/**
 * Writes an array of bytes to the backing Uint8Array.
 * @param {number} val The byte array to write.
 */
BinaryWriter.prototype.writeByteArray = function(bytes) {
  var pos = this._reserve(bytes.length);
  this.buf.set(bytes, pos);
};

/**
 * Gets a Uint8Array of the written data.
 * @param {Uint8Array} The written data.
 */
BinaryWriter.prototype.getBytes = function() {
  return this.buf.subarray(0, this.pos);
};

/**
 * Gets position of buffer
 * @return {number} position of buffer
 */
BinaryWriter.prototype.getPos = function() {
  return this.pos;
};

/**
 * Seeks back to a previous position
 * @param {number} pos the new position.
 */
BinaryWriter.prototype.seekBack = function(pos) {
  if (pos > this.pos) {
    throw new Error('Cant seek forward');
  }
  this.pos = pos;
};



/**
 * Computes the smallest power of 2 to make current exceed target.
 * @private
 * @param {number} current, must be positive
 * @param {number} target
 * @return {number} smallest power of 2, where current * power >= target
 */
function getMinPowerOfTwo(current, target) {
  var power = 1;
  while (current * power < target) {
    power *= 2;
  }
  return power;
}
