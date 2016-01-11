// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a write stream of VOM messages backed by a byte
 * array.
 * @private
 */

module.exports = ByteMessageWriter;

var RawVomWriter = require('./raw-vom-writer.js');
var versions = require('./versions.js');
var wiretype = require('../gen-vdl/v.io/v23/vom');

/**
 * Create a VOM message writer that writes to a byte array.
 * @constructor
 * @param {number} version vom version (e.g. 0x80, 0x81, ...)
 * @memberof module:vanadium.vom
 */
function ByteMessageWriter(version) {
  if (!version) {
    version = versions.version80;
  }
  this._version = version;
  this.rawWriter = new RawVomWriter();
  this.rawWriter._writeRawBytes(new Uint8Array([version]));
}

/**
 * Write a value message.
 * @private
 * @param {number} typeId The type ID of the message.
 * @param {boolean} sendLength true if the message length should be sent in the
 * header, false otherwise.
 * @param {boolean} hasAnyOrTypeObject true if the message contains an any
 * or a type object, false otherwise.
 * @param {Array.<number>} typeIds a list of referenced type ids, in order.
 * @param {Uint8Array} message The body of the message.
 */
ByteMessageWriter.prototype.writeValueMessage = function(
  typeId, sendLength, hasAnyOrTypeObject, typeIds, message) {
  if (typeId <= 0) {
    throw new Error('Type ids should be positive integers.');
  }
  this.rawWriter.writeInt(typeId);
  if (this._version !== versions.version80 && hasAnyOrTypeObject) {
    this.rawWriter.writeUint(typeIds.length);
    for (var i = 0; i < typeIds.length; i++) {
      this.rawWriter.writeUint(typeIds[i]);
    }
  }
  if (sendLength) {
    this.rawWriter.writeUint(message.length);
  }
  this.rawWriter._writeRawBytes(message);
};

/**
 * Write a type message.
 * @private
 * @param {number} typeId The type ID to define.
 * @param {Uint8Array} message The body of the type description message.
 * @param {bool} isIncomplete true if the type message is incomplete and
 * depends on further types being sent.
 */
ByteMessageWriter.prototype.writeTypeMessage = function(
  typeId, message, isIncomplete) {
  if (typeId <= 0) {
    throw new Error('Type ids should be positive integers.');
  }
  if (this._version !== versions.version80 && isIncomplete) {
    this.rawWriter.writeControlByte(wiretype.WireCtrlTypeIncomplete);
  }
  this.rawWriter.writeInt(-typeId);
  this.rawWriter.writeUint(message.length);
  this.rawWriter._writeRawBytes(message);
};

/**
 * Get the written bytes.
 * @return {Uint8Array} The bytes that were written.
 */
ByteMessageWriter.prototype.getBytes = function() {
  return this.rawWriter.getBytes();
};

ByteMessageWriter.prototype.reset = function() {
  this.rawWriter = new RawVomWriter();
};
