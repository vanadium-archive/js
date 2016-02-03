// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a read stream of VOM messages backed by a byte
 * array.
 * @private
 */

module.exports = ByteMessageReader;

var TypeUtil = require('../vdl/type-util.js');
var versions = require('./versions.js');
var wiretype = require('../gen-vdl/v.io/v23/vom');

/**
 * Create a generic VOM message reader.
 * @param {RawVomReader} rawReader= the underlying reader to use.
 * @constructor
 * @memberof module:vanadium.vom
 */
function ByteMessageReader(rawReader) {
  this.rawReader = rawReader;
  // Consume the header byte.
  var bmr = this;
  this.headerPromise = this.rawReader.readVersionByte().then(function(byte) {
    if (versions.allowedVersions.indexOf(byte) === -1) {
      throw new Error('Improperly formatted bytes. Must start with version');
    }
    bmr._version = byte;
  });
}

/**
 * Get the the type of the next value message.
 * @private
 * @param {TypeDecoder} typeDecoder The current type decoder.
 * @return {Promise<Type>} The type of the next message or null if the stream
 * has ended.
 */
ByteMessageReader.prototype.nextMessageType = function(typeDecoder) {
  this._typeIds = [];
  this._anyLens = [];
  var bsmr = this;
  return this.headerPromise.then(function() {
    return bsmr.rawReader.tryReadControlByte();
  }).then(function(ctrl) {
    if (ctrl === wiretype.WireCtrlTypeIncomplete.val) {
      // TODO(bprosnitz) We don't need to use type incomplete because the js
      // type decoder uses a less efficient algorithm than go to build types.
      // We should probably match the algorithm used by go.
    } else if (ctrl) {
      throw new Error('received unknown control byte: 0x' + ctrl.toString(16));
    }
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
      var next = Promise.resolve();
      if (bsmr._version !== versions.version80 &&
        (TypeUtil.hasAny(type) || TypeUtil.hasTypeObject(type))) {
        next = bsmr.rawReader.readUint().then(function(typeIdLen) {
          var next = Promise.resolve();
          var addTypeId = function() {
            return bsmr.rawReader.readUint().then(function(typeId) {
              bsmr._typeIds.push(typeId);
            });
          };
          for (var i = 0; i < typeIdLen; i++) {
            next = next.then(addTypeId);
          }
          return next;
        });
      }
      if (bsmr._version !== versions.version80 && TypeUtil.hasAny(type)) {
        next = next.then(function() {
            return bsmr.rawReader.readUint().then(function(anyLensLen) {
              var next = Promise.resolve();
              var addAnyLen = function() {
                return bsmr.rawReader.readUint().then(function(len) {
                  bsmr._anyLens.push(len);
                });
              };
              for (var i = 0; i < anyLensLen; i++) {
                next = next.then(addAnyLen);
              }
              return next;
          });
        });
      }
      return next.then(function() {
        if (TypeUtil.shouldSendLength(type)) {
          return bsmr.rawReader.readUint().then(function() {
            return type;
          });
        }
        return type;
      });
    });
  }, function(err) {
    // Hopefully this is an eof.
    return null;
  });
};
