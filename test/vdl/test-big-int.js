// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for BigInt.
 */

var test = require('prova');

var BigInt = require('./../../src/vdl/big-int.js');

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
      input: new BigInt(1, new Uint8Array([0x34, 0x96, 0x23, 0x43])),
      expectedResult: '882254659'
    },
    {
      input: new BigInt(-1, new Uint8Array([0x05, 0x77, 0x75, 0x77, 0x82])),
      expectedResult: '-23479023490'
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
    },
    {
      input: new BigInt(1, new Uint8Array([0x10, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
      expectedResult: '1267650600228229401496703205376'
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
    t.equals(test.first.greaterThan(test.second),
      test.expectedResult === FIRST_GREATER,
      'greaterThan check failed on ' + test.first + ' and ' + test.second);
    t.equals(test.first.greaterThanEquals(test.second),
      test.expectedResult === FIRST_GREATER ||
      test.expectedResult === EQUAL,
      'greaterThanEquals check failed on ' + test.first + ' and ' +
      test.second);
  }
  t.end();
});

test('left shift', function(t) {
  var tests = [
    {
      val: new BigInt(0, new Uint8Array([])),
      amt: 0,
      expectedResult: new BigInt(0, new Uint8Array([])),
    },
    {
      val: new BigInt(1, new Uint8Array([0x44, 0x99, 0x00])),
      amt: 0,
      expectedResult: new BigInt(1, new Uint8Array([0x44, 0x99, 0x00])),
    },
    {
      val: new BigInt(-1, new Uint8Array([0x89])),
      amt: 0,
      expectedResult: new BigInt(-1, new Uint8Array([0x89])),
    },
    {
      val: new BigInt(1, new Uint8Array([0x01, 0x01])),
      amt: 2,
      expectedResult: new BigInt(1, new Uint8Array([0x04, 0x04])),
    },
    {
      val: new BigInt(1, new Uint8Array([0x01, 0x01])),
      amt: 9,
      expectedResult: new BigInt(1, new Uint8Array([0x02, 0x02, 0x00])),
    },
    {
      val: new BigInt(1, new Uint8Array([0x02])),
      amt: 9,
      expectedResult: new BigInt(1, new Uint8Array([0x04, 0x00])),
    },
    {
      val: new BigInt(1, new Uint8Array([0x02])),
      amt: 7,
      expectedResult: new BigInt(1, new Uint8Array([0x01, 0x00])),
    },
    {
      val: new BigInt(1, new Uint8Array([0x00, 0x01, 0xff])),
      amt: 6,
      expectedResult: new BigInt(1, new Uint8Array([0x00, 0x7f, 0xc0])),
    },
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var leftShiftedVal = test.val.leftShift(test.amt);
    t.ok(leftShiftedVal.equals(test.expectedResult), test.val +
      ' << ' + test.amt + ' = ' + leftShiftedVal + ' (expected ' +
        test.expectedResult + ')');
  }
  t.end();
});

test('add and subtract', function(t) {
  var tests = [
    {
      first: new BigInt(0, new Uint8Array([])),
      second: new BigInt(0, new Uint8Array([])),
      addResult: new BigInt(0, new Uint8Array([])),
      subtractResult: new BigInt(0, new Uint8Array([]))
    },
    {
      first: new BigInt(0, new Uint8Array([])),
      second: new BigInt(1, new Uint8Array([0x01])),
      addResult: new BigInt(1, new Uint8Array([0x01])),
      subtractResult: new BigInt(-1, new Uint8Array([0x01]))
    },
    {
      first: new BigInt(0, new Uint8Array([])),
      second: new BigInt(-1, new Uint8Array([0x01])),
      addResult: new BigInt(-1, new Uint8Array([0x01])),
      subtractResult: new BigInt(1, new Uint8Array([0x01]))
    },
    {
      first: new BigInt(1, new Uint8Array([0x03])),
      second: new BigInt(1, new Uint8Array([0x05])),
      addResult: new BigInt(1, new Uint8Array([0x08])),
      subtractResult: new BigInt(-1, new Uint8Array([0x02])),
    },
    {
      first: new BigInt(-1, new Uint8Array([0x03])),
      second: new BigInt(-1, new Uint8Array([0x05])),
      addResult: new BigInt(-1, new Uint8Array([0x08])),
      subtractResult: new BigInt(1, new Uint8Array([0x02]))
    },
    {
      first: new BigInt(1, new Uint8Array([0x03])),
      second: new BigInt(-1, new Uint8Array([0x05])),
      addResult: new BigInt(-1, new Uint8Array([0x02])),
      subtractResult: new BigInt(1, new Uint8Array([0x08]))
    },
    {
      first: new BigInt(-1, new Uint8Array([0x03])),
      second: new BigInt(1, new Uint8Array([0x05])),
      addResult: new BigInt(1, new Uint8Array([0x02])),
      subtractResult: new BigInt(-1, new Uint8Array([0x08]))
    },
    {
      first: new BigInt(1, new Uint8Array([0x03])),
      second: new BigInt(-1, new Uint8Array([0x03])),
      addResult: new BigInt(0, new Uint8Array([])),
      subtractResult: new BigInt(1, new Uint8Array([0x06]))
    },
    {
      first: new BigInt(1, new Uint8Array([0xff])),
      second: new BigInt(1, new Uint8Array([0x01])),
      addResult: new BigInt(1, new Uint8Array([0x01, 0x00])),
      subtractResult: new BigInt(1, new Uint8Array([0xfe]))
    },
    {
      first: new BigInt(-1, new Uint8Array([0xff])),
      second: new BigInt(-1, new Uint8Array([0x01])),
      addResult: new BigInt(-1, new Uint8Array([0x01, 0x00])),
      subtractResult: new BigInt(-1, new Uint8Array([0xfe]))
    },
    {
      first: new BigInt(-1, new Uint8Array([0xff])),
      second: new BigInt(1, new Uint8Array([0xff])),
      addResult: new BigInt(0, new Uint8Array([])),
      subtractResult: new BigInt(-1, new Uint8Array([0x01, 0xfe]))
    },
    {
      first: new BigInt(1, new Uint8Array([0xff])),
      second: new BigInt(1, new Uint8Array([0xff])),
      addResult: new BigInt(1, new Uint8Array([0x01, 0xfe])),
      subtractResult: new BigInt(0, new Uint8Array([]))
    },
    {
      first: new BigInt(1, new Uint8Array([0x80])),
      second: new BigInt(1, new Uint8Array([0x7f])),
      addResult: new BigInt(1, new Uint8Array([0xff])),
      subtractResult: new BigInt(1, new Uint8Array([0x01]))
    },
    {
      first: new BigInt(1, new Uint8Array([0x39, 0x98, 0x99])),
      second: new BigInt(1, new Uint8Array([0x7f, 0x37])),
      addResult: new BigInt(1, new Uint8Array([0x3a, 0x17, 0xd0])),
      subtractResult: new BigInt(1, new Uint8Array([0x39, 0x19, 0x62])),
    },
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var addResult = test.first.add(test.second);
    t.ok(addResult.equals(test.addResult), test.first +
      ' + ' + test.second + ' = ' + addResult + ' (expected ' +
        test.addResult + ')');
    var subtractResult = test.first.subtract(test.second);
    t.ok(subtractResult.equals(test.subtractResult), test.first +
      ' - (' + test.second + ') = ' + subtractResult + ' (expected ' +
        test.subtractResult + ')');
  }
  t.end();
});

test('multiply and divide', function(t) {
  var tests = [];
  var leftSideNumbers = [-14342, -1024, -1023, -324, -92, -5, -1, 0,
    1, 6, 9, 111, 9543];
  var rightSideNumbers = [-3390, -235, -77, -3, -1, 0, 1, 2, 5, 99, 8000];

  var i;
  for (i = 0; i < leftSideNumbers.length; i++) {
    for (var j = 0; j < rightSideNumbers.length; j++) {
      var left = leftSideNumbers[i];
      var right = rightSideNumbers[j];
      var expectedMultiply = BigInt.fromNativeNumber(left * right);
      var expectedDivide = NaN;
      if (right !== 0) {
        var floorVal = Math.floor(Math.abs(left / right));
        if (left / right < 0) {
          floorVal = -floorVal;
        }
        expectedDivide = BigInt.fromNativeNumber(floorVal);
      }
      tests.push({
        first: BigInt.fromNativeNumber(left),
        second: BigInt.fromNativeNumber(right),
        multiply: expectedMultiply,
        divide: expectedDivide
      });
    }
  }

  for (i = 0; i < tests.length; i++) {
    var test = tests[i];
    var multiply = test.first.multiply(test.second);
    t.ok(multiply.equals(test.multiply), test.first +
      ' * ' + test.second + ' = ' + multiply + ' (expected ' +
        test.multiply + ')');
    var divide = test.first.divide(test.second);
    if (isNaN(test.divide)) {
      t.ok(isNaN(divide), test.first +
      ' / ' + test.second + ' = ' + divide + ' (expected ' +
        test.divide + ')');
    } else {
      t.ok(divide.equals(test.divide), test.first +
      ' / ' + test.second + ' = ' + divide + ' (expected ' +
        test.divide + ')');
    }
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
      input: 9007199254741001, // slightly too large to be accurate
      expectedFailure: true,
      expectedOutput: new BigInt(1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08]))
    },
    {
      input: -9007199254741001, // slightly too large (neg) to be accurate
      expectedFailure: true,
      expectedOutput: new BigInt(-1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08]))
    },
    {
      input: 0xfedcba0987654321ff, // 2 too many hex digits
      expectedFailure: true,
      expectedOutput: new BigInt(1,
        new Uint8Array([0xfe, 0xdc, 0xba, 0x09, 0x87, 0x65, 0x40, 0x00, 0x00]))
        // Instead of 0x43, 0x21, and 0xff, it got rounded down.
    },
    {
      input: 0.1, // non-integer that floors to 0
      expectedFailure: true,
      expectedOutput: new BigInt(0, new Uint8Array([]))
    },
    {
      input: -300.26, // non-integer that floors to -301
      expectedFailure: true,
      expectedOutput: new BigInt(-1, new Uint8Array([0x01, 0x2d]))
    },
    {
      input: '12', // non-number is parsed
      expectedFailure: false,
      expectedOutput: new BigInt(1, new Uint8Array([0x0c]))
    },
    {
      input: 'not a number', // non-parseable number becomes NaN, which is 0
      expectedFailure: true,
      expectedOutput: new BigInt(0, new Uint8Array([]))
    }
  ];
  var generator = function(test) {
    return function() {
      BigInt.fromNativeNumber(test.input);
    };
  };
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    if (test.hasOwnProperty('expectedFailure')) {
      t.throws(generator(test), undefined,
          'test: ' + test.input.toString(16) + ' should fail');
    } else {
      var result = BigInt.fromNativeNumber(test.input);
      t.ok(result.equals(test.expectedOutput), 'test: ' +
        test.input.toString(16) + ' got ' + result + ' and expected ' +
        test.expectedOutput);
    }

    // Always do the approx test. Use expectedOutputApprox
    var resultApprox = BigInt.fromNativeNumberApprox(test.input);
    t.ok(resultApprox.equals(test.expectedOutput), 'test: ' +
      test.input.toString(16) + ' approximation matches');
  }
  t.end();
});

test('toNativeNumber', function(t) {
  var tests = [
    {
      input: new BigInt(0, new Uint8Array([])),
      expectedOutput: 0,
      expectedOutputApprox: 0
    },
    {
      input: new BigInt(0, new Uint8Array([0x00])),
      expectedOutput: 0,
      expectedOutputApprox: 0
    },
    {
      input: new BigInt(1, new Uint8Array([0x01])),
      expectedOutput: 1,
      expectedOutputApprox: 1
    },
    {
      input: new BigInt(-1, new Uint8Array([0x01])),
      expectedOutput: -1,
      expectedOutputApprox: -1
    },
    {
      input: new BigInt(1, new Uint8Array([0x87, 0xf0])),
      expectedOutput: 0x87f0,
      expectedOutputApprox: 0x87f0
    },
    {
      input: new BigInt(-1, new Uint8Array([0x87, 0xf0])),
      expectedOutput: -0x87f0,
      expectedOutputApprox: -0x87f0
    },
    {
      input: new BigInt(1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
      expectedOutput: 0x20000000000000,
      expectedOutputApprox: 0x20000000000000
    },
    {
      input: new BigInt(-1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])),
      expectedOutput: -0x20000000000000,
      expectedOutputApprox: -0x20000000000000
    },
    {
      input: new BigInt(1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])),
      expectedFailure: true,
      expectedOutputApprox: 0x20000000000001
    },
    {
      input: new BigInt(-1,
        new Uint8Array([0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])),
      expectedFailure: true,
      expectedOutputApprox: -0x20000000000001
    },
    {
      input: new BigInt(1,
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
      expectedFailure: true,
      expectedOutputApprox: 0xffffffffffffffff
    },
    {
      input: new BigInt(-1,
        new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff])),
      expectedFailure: true,
      expectedOutputApprox: -0xffffffffffffffff
    },
    {
      input: new BigInt(1,
        new Uint8Array([0x0e, 0xcc, 0xf9, 0xa0, 0x2f])),
      expectedOutput: 63568453679,
      expectedOutputApprox: 63568453679
    },
  ];
  var generator = function(test) {
    return function() {
      test.input.toNativeNumber();
    };
  };
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    if (test.hasOwnProperty('expectedFailure')) {
      t.throws(generator(test), undefined,
          'test: ' + test.input + ' should fail');
      t.equals(test.input.toNativeNumberApprox(), test.expectedOutputApprox,
        'test: ' + test.input + ' approximation matches');
    } else {
      var result = test.input.toNativeNumber();
      t.equals(result, test.expectedOutput, 'test: ' +
        test.input.toString(16) + ' got ' + result + ' and expected ' +
        test.expectedOutput);
      var resultApprox = test.input.toNativeNumberApprox();
      t.equals(resultApprox, test.expectedOutputApprox,
        'test: ' + test.input.toString(16) + ' approximation matches');
    }
  }
  t.end();
});
