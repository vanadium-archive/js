/**
 * @fileoverview Tests for BigInt.
 */

var test = require('prova');

var BigInt = require('./big_int.js');

test('constructor and getters', function(t) {
  var sign = -1;
  var arr = new Uint8Array([0xf9, 0x88]);
  var intval = new BigInt(sign, arr);
  t.equals(intval.getSign(), sign);
  t.deepEquals(intval.getUintBytes(), arr);
  t.end();
});

test('toString', function(t) {
  var tests = [
    {
      input: new BigInt(0, new Uint8Array([])),
      expectedResult: '0'
    },
    {
      input: new BigInt(1, new Uint8Array([0x01])),
      expectedResult: '1'
    },
    {
      input: new BigInt(-1, new Uint8Array([0x01])),
      expectedResult: '-1'
    },
    {
      input: new BigInt(1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
      expectedResult: '9007199254740992'
    },
    {
      input: new BigInt(-1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
      expectedResult: '-9007199254740992'
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    t.equals(test.input.toString(), test.expectedResult,
      'input: ' + test.input + ' expectedResult: ' + test.expectedResult);
  }
  t.end();
});

test('comparisons', function(t) {
  // Note: FIRST_GREATER and SECOND_GREATER is here because this originally
  // checked more comparisons (e.g. greaterThan). These methods weren't needed
  // and were removed, but it makes sence to keep the logic here because
  // it is useful for equals and may be needed in the future.
  var EQUAL = 0;
  var FIRST_GREATER = 1;
  var SECOND_GREATER = -1;

  var tests = [
    {
      first: new BigInt(0, new Uint8Array([])),
      second: new BigInt(0, new Uint8Array([])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(0, new Uint8Array([0])),
      second: new BigInt(0, new Uint8Array([0, 0])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(1, new Uint8Array([0x01])),
      second: new BigInt(0, new Uint8Array([])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(0, new Uint8Array([0x00])),
      second: new BigInt(1, new Uint8Array([0x02])),
      expectedResult: SECOND_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x73])),
      second: new BigInt(1, new Uint8Array([0x73])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(-1, new Uint8Array([0x73])),
      second: new BigInt(-1, new Uint8Array([0x73])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(1, new Uint8Array([0x73])),
      second: new BigInt(-1, new Uint8Array([0x73])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(-1, new Uint8Array([0x73])),
      second: new BigInt(1, new Uint8Array([0x73])),
      expectedResult: SECOND_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x73])),
      second: new BigInt(1, new Uint8Array([0x33])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x33])),
      second: new BigInt(1, new Uint8Array([0x73])),
      expectedResult: SECOND_GREATER
    },
    {
      first: new BigInt(-1, new Uint8Array([0x01])),
      second: new BigInt(-1, new Uint8Array([0x73])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(-1, new Uint8Array([0x73])),
      second: new BigInt(-1, new Uint8Array([0x01])),
      expectedResult: SECOND_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x84, 0x73])),
      second: new BigInt(1, new Uint8Array([0x84, 0x73])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(-1, new Uint8Array([0x84, 0x73])),
      second: new BigInt(-1, new Uint8Array([0x84, 0x73])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(1, new Uint8Array([0x45, 0x73])),
      second: new BigInt(1, new Uint8Array([0x44, 0x73])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x44, 0x73])),
      second: new BigInt(1, new Uint8Array([0x44, 0x72])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x00, 0x00, 0x89])),
      second: new BigInt(1, new Uint8Array([0x89])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(1, new Uint8Array([0x00, 0x00, 0x89])),
      second: new BigInt(1, new Uint8Array([0x00, 0x89])),
      expectedResult: EQUAL
    },
    {
      first: new BigInt(1, new Uint8Array([0x00, 0x00, 0x89])),
      second: new BigInt(1, new Uint8Array([0x87])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x00, 0x00, 0x89])),
      second: new BigInt(1, new Uint8Array([0x00, 0x82])),
      expectedResult: FIRST_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x00, 0x00, 0x82])),
      second: new BigInt(1, new Uint8Array([0x00, 0x88])),
      expectedResult: SECOND_GREATER
    },
    {
      first: new BigInt(1, new Uint8Array([0x89])),
      second: new BigInt(1, new Uint8Array([0x00, 0x89])),
      expectedResult: EQUAL
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    t.equals(test.first.equals(test.second), test.expectedResult === EQUAL,
      'equals check failed on ' + test.first + ' and ' + test.second);
  }
  t.end();
});

test('fromNativeNumber', function(t) {
  var tests = [
    {
      input: 0,
      expectedOutput: new BigInt(0, new Uint8Array([]))
    },
    {
      input: 1,
      expectedOutput: new BigInt(1, new Uint8Array([0x01]))
    },
    {
      input: -1,
      expectedOutput: new BigInt(-1, new Uint8Array([0x01]))
    },
    {
      input: 0x7f89,
      expectedOutput: new BigInt(1, new Uint8Array([0x7f, 0x89]))
    },
    {
      input: -0x7f89,
      expectedOutput: new BigInt(-1, new Uint8Array([0x7f, 0x89]))
    },
    {
      input: 0x20000000000000,
      expectedOutput: new BigInt(1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
    },
    {
      input: -0x20000000000000,
      expectedOutput: new BigInt(-1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))
    },
    {
      input: 9007199254741001,
      expectedFailure: true,
      expectedOutput: null
    },
    {
      input: -9007199254741001,
      expectedFailure: true,
      expectedOutput: null
    },
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    if (test.hasOwnProperty('expectedFailure')) {
      t.throws(function() {
        BigInt.fromNativeNumber(test.input);
      }, undefined, 'test: ' + test.input.toString(16) + ' should fail');
    } else {
      var result = BigInt.fromNativeNumber(test.input);
      t.ok(result.equals(test.expectedOutput), 'test: ' +
        test.input.toString(16) + ' got ' + result + ' but expected ' +
        test.expectedOutput);
    }
  }
  t.end();
});

test('toNativeNumber', function(t) {
  var tests = [
    {
      input: new BigInt(0, new Uint8Array([])),
      expectedOutput: 0
    },
    {
      input: new BigInt(0, new Uint8Array([0x00])),
      expectedOutput: 0
    },
    {
      input: new BigInt(1, new Uint8Array([0x01])),
      expectedOutput: 1
    },
    {
      input: new BigInt(-1, new Uint8Array([0x01])),
      expectedOutput: -1
    },
    {
      input: new BigInt(1, new Uint8Array([0x87, 0xf0])),
      expectedOutput: 0x87f0
    },
    {
      input: new BigInt(-1, new Uint8Array([0x87, 0xf0])),
      expectedOutput: -0x87f0
    },
    {
      input: new BigInt(1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
      expectedOutput: 0x20000000000000
    },
    {
      input: new BigInt(-1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
      expectedOutput: -0x20000000000000
    },
    {
      input: new BigInt(1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])),
      expectedFailure: true
    },
    {
      input: new BigInt(-1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])),
      expectedFailure: true
    },
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    if (test.hasOwnProperty('expectedFailure')) {
      t.throws(function() {
        test.input.toNativeNumber();
      }, undefined, 'test: ' + test.input + ' should fail');
    } else {
      var result = test.input.toNativeNumber();
      t.equals(result, test.expectedOutput, 'test: ' +
        test.input.toString(16) + ' got ' + result + ' but expected ' +
        test.expectedOutput);
    }
  }
  t.end();
});