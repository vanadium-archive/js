/**
 * @fileoverview Represents a write stream of VOM messages backed by a byte
 * array.
 * @private
 */

module.exports = ByteArrayMessageWriter;

var RawVomWriter = require('./raw-vom-writer.js');

/**
 * Create a VOM message writer that writes to a byte array.
 * @private
 * @constructor
 */
function ByteArrayMessageWriter() {
  this.rawWriter = new RawVomWriter();
  this.rawWriter._writeRawBytes(new Uint8Array([0x80]));
}

/**
 * Write a value message.
 * @param {number} typeId The type ID of the message.
 * @param {boolean} sendLength true if the message length should be sent in the
 * header, false otherwise.
 * @param {Uint8Array} message The body of the message.
 */
ByteArrayMessageWriter.prototype.writeValueMessage = function(
  typeId, sendLength, message) {
  if (typeId <= 0) {
    throw new Error('Type ids should be positive integers.');
  }
  this.rawWriter.writeInt(typeId);
  if (sendLength) {
    this.rawWriter.writeUint(message.length);
  }
  this.rawWriter._writeRawBytes(message);
};

/**
 * Write a type message.
 * @param {number} typeId The type ID to define.
 * @param {Uint8Array} message The body of the type description message.
 */
ByteArrayMessageWriter.prototype.writeTypeMessage = function(typeId, message) {
  if (typeId <= 0) {
    throw new Error('Type ids should be positive integers.');
  }
  this.rawWriter.writeInt(-typeId);
  this.rawWriter.writeUint(message.length);
  this.rawWriter._writeRawBytes(message);
};

/**
 * Get the written bytes.
 * @return {Uint8Array} The bytes that were written.
 */
ByteArrayMessageWriter.prototype.getBytes = function() {
  return this.rawWriter.getBytes();
};
