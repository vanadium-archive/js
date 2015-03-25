// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests recovering written vom data js to js.
 */

var test = require('prova');

var BigInt = require('./../../src/vdl/big-int.js');
var RawVomWriter = require('./../../src/vom/raw-vom-writer');
var RawVomReader = require('./../../src/vom/raw-vom-reader');

test('Reading and writing big uint', function(t) {
  var testVals = [
    new BigInt(0, new Uint8Array([])),
    new BigInt(0, new Uint8Array([0])),
    new BigInt(1, new Uint8Array([1, 0])),
    new BigInt(1, new Uint8Array([1, 0, 0])),
    new BigInt(1, new Uint8Array([0xff])),
    new BigInt(1, new Uint8Array([0xff, 0xff])),
    new BigInt(1, new Uint8Array([0xff, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0xff, 0xff, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    new BigInt(1,
      new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]))
  ];

  for (var i = 0; i < testVals.length; i++) {
    var testVal = testVals[i];
    var rw = new RawVomWriter();
    rw.writeUint(testVal);
    var rr = new RawVomReader(rw.getBytes());
    var result = rr.readBigUint();
    t.ok(testVal.equals(result), 'expected ' + testVal + ' got ' + result);
  }
  t.end();
});

test('Reading and writing big int', function(t) {
  var testVals = [
    new BigInt(0, new Uint8Array([])),
    new BigInt(0, new Uint8Array([0])),
    new BigInt(1, new Uint8Array([1])),
    new BigInt(1, new Uint8Array([0, 0, 1])),
    new BigInt(1, new Uint8Array([0x7f])),
    new BigInt(1, new Uint8Array([0x7f, 0xff])),
    new BigInt(1, new Uint8Array([0x7f, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0x7f, 0xff, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0x7f, 0xff, 0xff, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff])),
    new BigInt(1, new Uint8Array([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    new BigInt(1,
      new Uint8Array([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    new BigInt(-1, new Uint8Array([0x01])),
    new BigInt(-1, new Uint8Array([0x80])),
    new BigInt(-1, new Uint8Array([0x80, 0x00])),
    new BigInt(-1, new Uint8Array([0x80, 0x00, 0x00])),
    new BigInt(-1, new Uint8Array([0x80, 0x00, 0x00, 0x00])),
    new BigInt(-1, new Uint8Array([0x80, 0x00, 0x00, 0x00, 0x00])),
    new BigInt(-1, new Uint8Array([0x80, 0x00, 0x00, 0x00, 0x00, 0x00])),
    new BigInt(-1, new Uint8Array([0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
    new BigInt(-1,
      new Uint8Array([0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
  ];

  for (var i = 0; i < testVals.length; i++) {
    var testVal = testVals[i];
    var rw = new RawVomWriter();
    rw.writeInt(testVal);
    var rr = new RawVomReader(rw.getBytes());
    var result = rr.readBigInt();
    t.ok(testVal.equals(result), 'expected ' + testVal + ' got ' + result);
  }
  t.end();
});

test('Reading and writing uint', function(t) {
  var testVals = [
    0,
    1,
    0x50,
    0xff,
    0xffff,
    0xffffff,
    0xffffffff
  ];

  for (var i = 0; i < testVals.length; i++) {
    var testVal = testVals[i];
    var rw = new RawVomWriter();
    rw.writeUint(testVal);
    var rr = new RawVomReader(rw.getBytes());
    var result = rr.readUint();
    t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
  }
  t.end();
});

test('Reading and writing int', function(t) {
  var testVals = [
    0,
    1,
    -1,
    0x50,
    -0x50,
    0xff,
    0xffff,
    0xffffff,
    0x7fffffff,
    -0xff,
    -0xffff,
    -0xffffff,
    -0x80000000
  ];

  for (var i = 0; i < testVals.length; i++) {
    var testVal = testVals[i];
    var rw = new RawVomWriter();
    rw.writeInt(testVal);
    var rr = new RawVomReader(rw.getBytes());
    var result = rr.readInt();
    t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
  }
  t.end();
});

test('Reading and writing float', function(t) {
  var testVals = [
    0,
    1,
    -1,
    1088.12,
    -1088.12,
    0.000000004,
    -0.000000004,
    Number.MAX_VALUE,
    Number.MIN_VALUE,
    Number.NEGATIVE_INFINITY,
    Number.POSITIVE_INFINITY
  ];

  for (var i = 0; i < testVals.length; i++) {
    var testVal = testVals[i];
    var rw = new RawVomWriter();
    rw.writeFloat(testVal);
    var rr = new RawVomReader(rw.getBytes());
    var result = rr.readFloat();
    t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
  }
  t.end();
});

test('Reading and writing string', function(t) {
  var testVals = [
    '',
    'abcd',
    'ଆ➓龥𐇐𒅑'
  ];

  for (var i = 0; i < testVals.length; i++) {
    var testVal = testVals[i];
    var rw = new RawVomWriter();
    rw.writeString(testVal);
    var rr = new RawVomReader(rw.getBytes());
    var result = rr.readString();
    t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
  }
  t.end();
});

test('Reading and writing bool', function(t) {
  var testVals = [
    true,
    false
  ];

  for (var i = 0; i < testVals.length; i++) {
    var testVal = testVals[i];
    var rw = new RawVomWriter();
    rw.writeBool(testVal);
    var rr = new RawVomReader(rw.getBytes());
    var result = rr.readBool();
    t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
  }
  t.end();
});

test('Reading and writing multiple values', function(t) {
  var rw = new RawVomWriter();
  rw.writeString('test');
  rw.writeFloat(9.4);
  rw.writeInt(-4);
  rw.writeUint(8);

  var rr = new RawVomReader(rw.getBytes());
  t.equals(rr.readString(), 'test');
  t.equals(rr.readFloat(), 9.4);
  t.equals(rr.readInt(), -4);
  t.equals(rr.readUint(), 8);
  t.end();
});
