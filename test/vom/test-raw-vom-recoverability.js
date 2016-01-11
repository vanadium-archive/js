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
var Promise = require('../../src/lib/promise');
var versions = require('./../../src/vom/versions.js');

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

  var promises = [];
  function runTest(testVal) {
    var rw = new RawVomWriter();
    rw.writeUint(testVal);
    var rr = new RawVomReader(rw.getBytes());
    promises.push(rr.readBigUint().then(function(result) {
      t.ok(testVal.equals(result), 'expected ' + testVal + ' got ' + result);
    }));
  }
  for (var i = 0; i < testVals.length; i++) {
    runTest(testVals[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
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

  var promises = [];
  function runTest(testVal) {
    var rw = new RawVomWriter();
    rw.writeInt(testVal);
    var rr = new RawVomReader(rw.getBytes());
    promises.push(rr.readBigInt().then(function(result) {
      t.ok(testVal.equals(result), 'expected ' + testVal + ' got ' + result);
    }));
  }

  for (var i = 0; i < testVals.length; i++) {
    runTest(testVals[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
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

  var promises = [];
  function runTest(testVal) {
    var rw = new RawVomWriter();
    rw.writeUint(testVal);
    var rr = new RawVomReader(rw.getBytes());
    promises.push(rr.readUint().then(function(result) {
      t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
    }));
  }

  for (var i = 0; i < testVals.length; i++) {
    runTest(testVals[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
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

  var promises = [];
  function runTest(testVal) {
    var rw = new RawVomWriter();
    rw.writeInt(testVal);
    var rr = new RawVomReader(rw.getBytes());
    promises.push(rr.readInt().then(function(result) {
      t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
    }));
  }
  for (var i = 0; i < testVals.length; i++) {
    runTest(testVals[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
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

  var promises = [];
  function runTest(testVal) {
    var rw = new RawVomWriter();
    rw.writeFloat(testVal);
    var rr = new RawVomReader(rw.getBytes());
    promises.push(rr.readFloat().then(function(result) {
      t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
    }));
  }
  for (var i = 0; i < testVals.length; i++) {
    runTest(testVals[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
});

test('Reading and writing string', function(t) {
  var testVals = [
    '',
    'abcd',
    'ଆ➓龥𐇐𒅑'
  ];

  var promises = [];
  function runTest(testVal) {
    var rw = new RawVomWriter();
    rw.writeString(testVal);
    var rr = new RawVomReader(rw.getBytes());
    promises.push(rr.readString().then(function(result) {
      t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
    }));
  }

  for (var i = 0; i < testVals.length; i++) {
    runTest(testVals[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
});

test('Reading and writing bool', function(t) {
  var testVals = [
    true,
    false
  ];

  var promises = [];
  function runTest(testVal) {
    var rw = new RawVomWriter();
    rw.writeBool(testVal);
    var rr = new RawVomReader(rw.getBytes());
    rr._version = Promise.resolve(versions.version80);
    promises.push(rr.readBool().then(function(result) {
    t.equals(result, testVal, 'expected ' + testVal + ' got ' + result);
    }));
  }
  for (var i = 0; i < testVals.length; i++) {
    runTest(testVals[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
});

test('Reading and writing multiple values', function(t) {
  var rw = new RawVomWriter();
  rw.writeString('test');
  rw.writeFloat(9.4);
  rw.writeInt(-4);
  rw.writeUint(8);

  var rr = new RawVomReader(rw.getBytes());
  rr.readString().then(function(val) {
    t.equals(val, 'test');
    return rr.readFloat();
  }).then(function(val) {
    t.equals(val, 9.4);
    return rr.readInt();
  }).then(function(val) {
    t.equals(val, -4);
    return rr.readUint();
  }).then(function(val) {
    t.equals(val, 8);
    t.end();
  }).catch(t.end);
});
