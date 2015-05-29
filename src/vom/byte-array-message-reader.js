// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a read stream of VOM messages backed by a byte
 * array.
 * @private
 */

module.exports = ByteArrayMessageReader;

var RawVomReader = require('./raw-vom-reader.js');
var TypeUtil = require('../vdl/type-util.js');


/**
 * Create a VOM message reader backed by a byte array.
 * @param {Uint8Array|RawVomReader} bytes The byte array.
 * @constructor
 * @memberof module:vanadium.vom
 */
function ByteArrayMessageReader(bytes) {
  if (!(bytes instanceof RawVomReader)) {
    this.rawReader = new RawVomReader(bytes);
  } else {
    this.rawReader = bytes;
  }

  this._headerPromise = this.rawReader.readByte().then(function(b) {
    if (b !== 0x80) {
      throw new Error('Improperly formatted bytes. Must start with 0x80 ' + b);
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
ByteArrayMessageReader.prototype.nextMessageType = function(typeDecoder) {
  var bamr = this;
  return this._headerPromise.then(function() {
    return bamr.rawReader.readInt().then(function(typeId) {
      if (typeId < 0) {
        // Type message.  We add the type to the typeDecoder and continue
        // reading trying to find a value message.
        return  bamr.rawReader.readUint().then(function(len) {
          return bamr.rawReader._readRawBytes(len);
        }).then(function(body) {
          return typeDecoder.defineType(-typeId, body);
        }).then(function() {
          return bamr.nextMessageType(typeDecoder);
        });
      }
      return typeDecoder.lookupType(typeId).then(function (type) {
        if (TypeUtil.shouldSendLength(type)) {
          return bamr.rawReader.readUint().then(function() {
            return type;
          });
        }
        return type;
      });
    }, function(err) {
      // Hopefull this is an eof.
      return null;
    });
  });
};
