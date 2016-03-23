// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests compatibility with go.
 */

var test = require('tape');

var BigInt = require('./../../src/vdl/big-int.js');
var RawVomWriter = require('./../../src/vom/raw-vom-writer');
var RawVomReader = require('./../../src/vom/raw-vom-reader');
var versions = require('./../../src/vom/versions');
var ByteUtil = require('./../../src/vdl/byte-util.js');
var Promise = require('../../src/lib/promise');

var testTypes = {
  UINT: {
    name: 'uint',
    write: 'writeUint',
    read: 'readUint'
  },
  INT: {
    name: 'int',
    write: 'writeInt',
    read: 'readInt'
  },
  BIG_UINT: {
    name: 'biguint',
    write: 'writeUint',
    read: 'readBigUint'
  },
  BIG_INT: {
    name: 'bigint',
    write: 'writeInt',
    read: 'readBigInt'
  },
  FLOAT: {
    name: 'float',
    write: 'writeFloat',
    read: 'readFloat'
  },
  STRING: {
    name: 'string',
    write: 'writeString',
    read: 'readString'
  },
  BOOL: {
    name: 'bool',
    write: 'writeBool',
    read: 'readBool',
  }
};

var tests = [
  { type: testTypes.BOOL, val: false, hexString: '00' },
  { type: testTypes.BOOL, val: true, hexString: '01' },

  { type: testTypes.UINT, val: 0, hexString: '00' },
  { type: testTypes.UINT, val: 1, hexString: '01' },
  { type: testTypes.UINT, val: 2, hexString: '02' },
  { type: testTypes.UINT, val: 127, hexString: '7f' },
  { type: testTypes.UINT, val: 128, hexString: 'ff80' },
  { type: testTypes.UINT, val: 255, hexString: 'ffff' },
  { type: testTypes.UINT, val: 256, hexString: 'fe0100' },
  { type: testTypes.UINT, val: 257, hexString: 'fe0101' },
  { type: testTypes.UINT, val: 0xffff, hexString: 'feffff' },
  { type: testTypes.UINT, val: 0xffffff, hexString: 'fdffffff' },
  { type: testTypes.UINT, val: 0xffffffff, hexString: 'fcffffffff' },
  { type: testTypes.BIG_UINT,
    val: new BigInt(1, new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff])),
    hexString: 'fbffffffffff' },
  { type: testTypes.BIG_UINT,
    val: new BigInt(1, new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    hexString: 'faffffffffffff' },
  { type: testTypes.BIG_UINT,
    val: new BigInt(1,
      new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    hexString: 'f9ffffffffffffff' },
  { type: testTypes.BIG_UINT,
    val: new BigInt(1,
      new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    hexString: 'f8ffffffffffffffff' },

  { type: testTypes.INT, val: 0, hexString: '00' },
  { type: testTypes.INT, val: 1, hexString: '02' },
  { type: testTypes.INT, val: 2, hexString: '04' },
  { type: testTypes.INT, val: 63, hexString: '7e' },
  { type: testTypes.INT, val: 64, hexString: 'ff80' },
  { type: testTypes.INT, val: 65, hexString: 'ff82' },
  { type: testTypes.INT, val: 127, hexString: 'fffe' },
  { type: testTypes.INT, val: 128, hexString: 'fe0100' },
  { type: testTypes.INT, val: 129, hexString: 'fe0102' },
  { type: testTypes.INT, val: (1 << 15) - 1, hexString: 'fefffe' },
  { type: testTypes.INT, val: 0x7fffffff, hexString: 'fcfffffffe' },
  { type: testTypes.BIG_INT,
    val: new BigInt(1,
      new Uint8Array([0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
    hexString: 'f8fffffffffffffffe' },
  { type: testTypes.BIG_INT,
    val: new BigInt(-1, new Uint8Array([0x01])),
    hexString: '01' },
  { type: testTypes.INT, val: -1, hexString: '01' },
  { type: testTypes.INT, val: -2, hexString: '03' },
  { type: testTypes.INT, val: -64, hexString: '7f' },
  { type: testTypes.INT, val: -65, hexString: 'ff81' },
  { type: testTypes.INT, val: -66, hexString: 'ff83' },
  { type: testTypes.INT, val: -128, hexString: 'ffff' },
  { type: testTypes.INT, val: -129, hexString: 'fe0101' },
  { type: testTypes.INT, val: -130, hexString: 'fe0103' },
  { type: testTypes.INT, val: -(1 << 15), hexString: 'feffff' },
  { type: testTypes.INT, val: -0x80000000, hexString: 'fcffffffff' },
  { type: testTypes.BIG_INT,
    val: new BigInt(-1,
      new Uint8Array([0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
    hexString: 'f8ffffffffffffffff' },

  { type: testTypes.FLOAT, val: 0.0, hexString: '00' },
  { type: testTypes.FLOAT, val: 1.0, hexString: 'fef03f' },
  { type: testTypes.FLOAT, val: 17.0, hexString: 'fe3140' },
  { type: testTypes.FLOAT, val: 18.0, hexString: 'fe3240' },

  { type: testTypes.STRING, val: '', hexString: '00' },
  { type: testTypes.STRING, val: 'abc', hexString: '03616263' },
  { type: testTypes.STRING, val: 'defghi', hexString: '06646566676869' },
];

test('Raw writer compatibility', function(t) {
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    var rw = new RawVomWriter();
    rw[test.type.write](test.val);

    var result = ByteUtil.bytes2Hex(rw.getBytes());
    t.equal(result, test.hexString, 'type: ' + test.type.name + ' val: ' +
      test.val);
  }
  t.end();
});

test('Raw reader compatibility', function(t) {
  var promises = [];
  function runTest(test) {
    var rr = new RawVomReader(ByteUtil.hex2Bytes(test.hexString));
    rr._version = Promise.resolve(versions.version80);
    promises.push(rr[test.type.read]().then(function(result) {
      t.equal(ByteUtil.bytes2Hex(result), ByteUtil.bytes2Hex(test.val),
              'type: ' + test.type.name + ' input: ' + test.hexString);
    }));
  }
  for (var i = 0; i < tests.length; i++) {
    runTest(tests[i]);
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
});
