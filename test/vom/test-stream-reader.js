// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for stream reader.
 */

var test = require('prova');

var StreamReader = require('./../../src/vom/stream-reader.js');
var ByteUtil = require('./../../src/vdl/byte-util.js');

test('readByte with data already loaded', function(t) {
  var expectedBytes = [ 0x0, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var buf = new Uint8Array(expectedBytes);

  var sr = new StreamReader();
  sr.addBytes(buf);
  var i = 0;
  function checkByte(b) {
    t.equals(b, expectedBytes[i], 'index ' + i + ' differs');
    i++;
    if (i < expectedBytes.length) {
      return sr.readByte().then(checkByte);
    } else {
      t.end();
    }
  }
  sr.readByte().then(checkByte).catch(t.end);
});

test('readByteArray with data already loaded', function(t) {
  var expectedBytes = [ 0x00, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var buf = new Uint8Array(expectedBytes);
  var sr = new StreamReader();
  sr.addBytes(buf);
  sr.readByteArray(2).then(function(b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x00, 0xff])));
    return sr.readByteArray(4);
  }).then(function(b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x10, 0x20, 0x30, 0x40])));
    t.end();
  }).catch(t.end);
});

test('read after close returns error', function(t) {
  var sr = new StreamReader();
  sr.close();
  sr.readByte().then(function() {
    t.fail('should not have returned a value');
    t.end();
  }, function(err) {
    t.ok(err);
    t.end();
  });
});

test('read byte before data is set', function(t) {
  var expectedBytes = [ 0x0, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var buf = new Uint8Array(expectedBytes);

  var sr = new StreamReader();
  var i = 0;
  function checkByte(b) {
    t.equals(b, expectedBytes[i], 'index ' + i + ' differs');
    i++;
    if (i < expectedBytes.length) {
      return sr.readByte().then(checkByte);
    } else {
      t.end();
    }
  }

  // Read before there is data.
  sr.readByte().then(checkByte).catch(t.end);

  sr.addBytes(buf);
});

test('readByteArray before data is set', function(t) {
  var expectedBytes = [ 0x00, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var buf = new Uint8Array(expectedBytes);
  var sr = new StreamReader();
  sr.readByteArray(2).then(function(b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x00, 0xff])));
    return sr.readByteArray(4);
  }).then(function (b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x10, 0x20, 0x30, 0x40])));
    t.end();
  }).catch(t.end);
  sr.addBytes(buf);
});

test('readByteArray with multiple chunks', function(t) {
  var expectedBytes = [ 0x00, 0xff, 0x10, 0x20, 0x30, 0x40 ];
  var buf1 = new Uint8Array(expectedBytes.slice(0, 3));
  var buf2 = new Uint8Array(expectedBytes.slice(3));
  var sr = new StreamReader();
  sr.addBytes(buf1);
  sr.readByteArray(2).then(function(b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x00, 0xff])));
    return sr.readByteArray(4);
  }).then(function (b) {
    t.equals(ByteUtil.bytes2Hex(b),
             ByteUtil.bytes2Hex(new Uint8Array([0x10, 0x20, 0x30, 0x40])));
    t.end();
  }).catch(t.end);
  sr.addBytes(buf2);
});

test('peekByte doesn\'t consume', function(t) {
  var expectedBytes = [ 0x00 ];
  var buf1 = new Uint8Array(expectedBytes);
  var sr = new StreamReader();
  sr.peekByte().then(function(b) {
    return sr.peekByte();
  }).then(function(b) {
    t.equals(ByteUtil.bytes2Hex(new Uint8Array([b])), '00');
    t.end();
  }).catch(t.end);
  sr.addBytes(buf1);
});

test('readByteArray without enough data and eof', function(t) {
  var sr = new StreamReader([0x00]);
  sr.readByteArray(4).then(function() {
    t.fail('should not have succeeded');
  }, function(err) {}).then(t.end);
  sr.close();
});
