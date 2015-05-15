// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Deferred = require('../lib/deferred');
var byteUtil = require('../vdl/byte-util');
var TaskSequence = require('../lib/task-sequence');

module.exports = StreamReader;

/**
 * StreamReader provides a Reader api over a stream of bytes
 * @private
 * @constructor
 */
function StreamReader() {
  this._bufs = [];
  this._closed = false;
  this._sequence = new TaskSequence();

  this._bytesAvailableDef = new Deferred();
}


/**
 * Adds a set of bytes to the stream
 * @param {Uint8Array} bytes The bytes to add
 */
StreamReader.prototype.addBytes = function(bytes) {
  if (bytes.length === 0) {
    return;
  }
  this._bufs.push(bytes);
  this._bytesAvailableDef.resolve();
};

/**
 * Closes the stream reader, which forces readers to
 * consume all the bytes left.
 */
StreamReader.prototype.close = function() {
  this._closed = true;
  this._bytesAvailableDef.resolve();
};

StreamReader.prototype._waitForData = function() {
  if (this._hasBytes() || this._closed) {
    return Promise.resolve();
  }
  this._bytesAvailableDef = new Deferred();
  return this._bytesAvailableDef.promise;
};

StreamReader.prototype._hasBytes = function() {
  return this._bufs.length > 0;
};

/**
 * Reads a byte from the stream
 * @return {Promise<number>}
 */
StreamReader.prototype.readByte = function() {
  var reader = this;
  var def = new Deferred();
  function readByte() {
    return reader._waitForData().then(function() {
      if (!reader._hasBytes()) {
        return Promise.reject(
          new Error('Failed to read byte, eof is ' + reader._closed));
      }
      var byte = reader._bufs[0][0];
      if (reader._bufs[0].length === 1) {
        reader._bufs.shift();
      } else {
        reader._bufs[0] = reader._bufs[0].subarray(1);
      }
      return byte;
    }).then(function(b) {
      def.resolve(b);
    }, function(err) {
      def.reject(err);
    });
  }
  reader._sequence.addTask(readByte);
  return def.promise;
};

/**
 * Peeks a byte from the stream
 * @return {Promise<number>}
 */
StreamReader.prototype.peekByte = function() {
  var reader = this;
  var def = new Deferred();
  function peekByte() {
    return reader._waitForData().then(function() {
      if (!reader._hasBytes()) {
        return Promise.reject(
          new Error('Failed to read byte, eof is ' + reader._closed));
      }
      return reader._bufs[0][0];
    }).then(function(b) {
      def.resolve(b);
    }, function(err) {
      def.reject(err);
    });
  }
  reader._sequence.addTask(peekByte);
  return def.promise;
};

/**
 * Reads a byte array from the stream
 * @param {number} amt The number to read.
 * @return {Promise<Uint8Array>} A promise that will be resolved
 * with the result.
 */
StreamReader.prototype.readByteArray = function(amt) {
  var reader = this;
  var def = new Deferred();
  var pos = 0;
  var buf = new Uint8Array(amt);
  var bytesNeeded = amt;
  function readByteArray() {
    return reader._waitForData().then(function() {
      var currentBuf = reader._bufs[0];
      while (bytesNeeded > 0 && currentBuf) {
        if (currentBuf.length < bytesNeeded) {
          // Consume the whole array.
          buf.set(currentBuf, pos);
          pos += currentBuf.length;
          bytesNeeded -= currentBuf.length;
          reader._bufs.shift();
          currentBuf = reader._bufs[0];
        } else {
          buf.set(currentBuf.subarray(0, bytesNeeded), pos);
          pos += bytesNeeded;
          reader._bufs[0] = currentBuf.subarray(bytesNeeded);
          bytesNeeded = 0;
        }
      }

      if (bytesNeeded === 0) {
        return buf;
      }

      if (reader._closed) {
        return Promise.reject(
          new Error('Failed to read ' + amt + 'bytes, eof is true'));
      }
      return readByteArray();
    }).then(function(arr) {
      return def.resolve(arr);
    }, function(err) {
      return def.reject(err);
    });
  }

  this._sequence.addTask(readByteArray);
  return def.promise;
};

StreamReader.prototype.getHexBytes = function() {
  return this._bufs.map(byteUtil.bytes2Hex).join('');
};
