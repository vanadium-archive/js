// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for binary reader.
 */

var test = require('tape');

var BinaryReader = require('./../../src/vom/binary-reader.js');
var ByteUtil = require('./../../src/vdl/byte-util.js');
var promiseFor = require('../../src/lib/async-helper').promiseFor;

test('readByte', function(t) {
  var expectedBytes = [ 0x0, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var buf = new Uint8Array(expectedBytes);

  var br = new BinaryReader(buf);
  var i = 0;
  function checkByte(b) {
    return br.readByte().then(function(b) {
      t.equals(b, expectedBytes[i], 'index ' + i + ' differs');
      i++;
    });
  }
  promiseFor(expectedBytes.length, checkByte).then(t.end).catch(t.end);
});

test('readByteArray', function(t) {
  var expectedBytes = [ 0x00, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var br = new BinaryReader(new Uint8Array(expectedBytes));
  br.readByteArray(2).then(function(b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x00, 0xff])));
    return br.readByteArray(4);
  }).then(function (b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x10, 0x20, 0x30, 0x40])));
    t.end();
  }).catch(t.end);
});
