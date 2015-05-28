// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a read stream of VOM messages backed by a byte
 * array.
 * @private
 */

module.exports = ByteStreamMessageReader;

var StreamReader = require('./stream-reader.js');
var RawVomReader = require('./raw-vom-reader.js');
var TypeUtil = require('../vdl/type-util.js');

/**
 * Create a VOM message reader backed by a byte stream.
 * @constructor
 * @memberof module:vanadium.vom
 */
function ByteStreamMessageReader() {
  this.rawReader = new RawVomReader(new StreamReader());
  // Consume the header byte.
  this.headerPromise = this.rawReader.readByte(1).then(function(byte) {
    if (byte !== 0x80) {
      throw new Error('Improperly formatted bytes. Must start with 0x80');
    }
  });
}

/**
 * Get the the type of the next value message.
 * @private
 * @param {TypeDecoder} typeDecoder The current type decoder.
 * @return {Promise<Type>} The type of the next message or null if the stream
 * has ended.
 */
ByteStreamMessageReader.prototype.nextMessageType = function(typeDecoder) {
  var bsmr = this;
  return this.headerPromise.then(function() {
    return bsmr.rawReader.readInt();
  }).then(function(typeId) {
    if (typeId < 0) {
      // Type message.  We add the type to the typeDecoder and continue reading
      // trying to find a value message.
      return  bsmr.rawReader.readUint().then(function(len) {
        return bsmr.rawReader._readRawBytes(len);
      }).then(function(body) {
        return typeDecoder.defineType(-typeId, body);
      }).then(function() {
        return bsmr.nextMessageType(typeDecoder);
      });
    }
    return typeDecoder.lookupType(typeId).then(function(type) {
      if (TypeUtil.shouldSendLength(type)) {
        return bsmr.rawReader.readUint().then(function() {
          return type;
        });
      }
      return type;
    });
  }, function(err) {
    // Hopefull this is an eof.
    return null;
  });
};

ByteStreamMessageReader.prototype.addBytes = function(bytes) {
  this.rawReader._reader.addBytes(bytes);
};
