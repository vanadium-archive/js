/**
 * @fileoverview Tests for byte util.
 */

var test = require('prova');

var ByteUtil = require('./../../src/vom/byte_util.js');

test('emptyOrAllZero', function(t) {
  var tests = [
    {
      input: new Uint8Array([]),
      expectedOutput: true
    },
    {
      input: new Uint8Array([0x00]),
      expectedOutput: true
    },
    {
      input: new Uint8Array([0xff]),
      expectedOutput: false
    },
    {
      input: new Uint8Array([0x00, 0x00]),
      expectedOutput: true
    },
    {
      input: new Uint8Array([0x00, 0xaa, 0x00]),
      expectedOutput: false
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var inputCopy = new Uint8Array(test.input);
    var result = ByteUtil.emptyOrAllZero(inputCopy);
    t.equals(result, test.expectedOutput, 'for input ' +
      ByteUtil.bytes2Hex(test.input) + ' expected ' +
      test.expectedOutput + ', but got ' + result);
  }
  t.end();
});

test('allOne', function(t) {
  var tests = [
    {
      input: new Uint8Array([]),
      expectedOutput: false
    },
    {
      input: new Uint8Array([0xff]),
      expectedOutput: true
    },
    {
      input: new Uint8Array([0x00]),
      expectedOutput: false
    },
    {
      input: new Uint8Array([0x07]),
      expectedOutput: false
    },
    {
      input: new Uint8Array([0xff, 0x04, 0xff]),
      expectedOutput: false
    },
    {
      input: new Uint8Array([0xff, 0xff, 0xff]),
      expectedOutput: true
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var inputCopy = new Uint8Array(test.input);
    var result = ByteUtil.allOne(inputCopy);
    t.equals(result, test.expectedOutput, 'for input ' +
      ByteUtil.bytes2Hex(test.input) + ' expected ' +
      test.expectedOutput + ', but got ' + result);
  }
  t.end();
});

test('shiftLeftOne', function(t) {
  var tests = [
    {
      input: new Uint8Array([]),
      expectedOutput: new Uint8Array([])
    },
    {
      input: new Uint8Array([0x00]),
      expectedOutput: new Uint8Array([0x00])
    },
    {
      input: new Uint8Array([0x55]),
      expectedOutput: new Uint8Array([0xaa])
    },
    {
      input: new Uint8Array([0x80]),
      expectedOutput: new Uint8Array([0x01, 0x00])
    },
    {
      input: new Uint8Array([0xff]),
      expectedOutput: new Uint8Array([0x01, 0xfe])
    },
    {
      input: new Uint8Array([0x00, 0x80]),
      expectedOutput: new Uint8Array([0x01, 0x00])
    },
    {
      input: new Uint8Array([0x80, 0x00]),
      expectedOutput: new Uint8Array([0x01, 0x00, 0x00])
    },
    {
      input: new Uint8Array([0x88, 0x44, 0x33, 0x22, 0x11]),
      expectedOutput: new Uint8Array([0x01, 0x10, 0x88, 0x66, 0x44, 0x22])
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var inputCopy = new Uint8Array(test.input);
    inputCopy = ByteUtil.shiftLeftOne(inputCopy);
    t.deepEquals(inputCopy, test.expectedOutput, 'for input ' +
      ByteUtil.bytes2Hex(test.input) + ' expected ' +
      ByteUtil.bytes2Hex(test.expectedOutput) + ', but got ' +
      ByteUtil.bytes2Hex(inputCopy));
  }
  t.end();
});

test('shiftRightOne', function(t) {
  var tests = [
    {
      input: new Uint8Array([]),
      expectedOutput: new Uint8Array([])
    },
    {
      input: new Uint8Array([0x00]),
      expectedOutput: new Uint8Array([0x00])
    },
    {
      input: new Uint8Array([0xff]),
      expectedOutput: new Uint8Array([0x7f])
    },
    {
      input: new Uint8Array([0x7f]),
      expectedOutput: new Uint8Array([0x3f])
    },
    {
      input: new Uint8Array([0x10]),
      expectedOutput: new Uint8Array([0x08])
    },
    {
      input: new Uint8Array([0x55]),
      expectedOutput: new Uint8Array([0x2a])
    },
    {
      input: new Uint8Array([0x01, 0x00]),
      expectedOutput: new Uint8Array([0x00, 0x80])
    },
    {
      input: new Uint8Array([0x10, 0x00]),
      expectedOutput: new Uint8Array([0x08, 0x00])
    },
    {
      input: new Uint8Array([0x10, 0x88, 0x66, 0x44, 0x22]),
      expectedOutput: new Uint8Array([0x08, 0x44, 0x33, 0x22, 0x11])
    },
    {
      input: new Uint8Array([0x90, 0x88, 0x66, 0x44, 0x22]),
      expectedOutput: new Uint8Array([0x48, 0x44, 0x33, 0x22, 0x11])
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var inputCopy = new Uint8Array(test.input);
    inputCopy = ByteUtil.shiftRightOne(inputCopy);
    t.deepEquals(inputCopy, test.expectedOutput, 'for input ' +
      ByteUtil.bytes2Hex(test.input) + ' expected ' +
      ByteUtil.bytes2Hex(test.expectedOutput) + ', but got ' +
      ByteUtil.bytes2Hex(inputCopy));
  }
  t.end();
});

test('twosComplement', function(t) {
  var tests = [
    {
      input: new Uint8Array([]),
      expectedOutput: new Uint8Array([])
    },
    {
      input: new Uint8Array([0x00]),
      expectedOutput: new Uint8Array([0x00])
    },
    {
      input: new Uint8Array([0xff]),
      expectedOutput: new Uint8Array([0x01])
    },
    {
      input: new Uint8Array([0x80]),
      expectedOutput: new Uint8Array([0x80])
    },
    {
      input: new Uint8Array([0xa8]),
      expectedOutput: new Uint8Array([0x58])
    },
    {
      input: new Uint8Array([0x34, 0x48]),
      expectedOutput: new Uint8Array([0xcb, 0xb8])
    },
    {
      input: new Uint8Array([0x79, 0x71]),
      expectedOutput: new Uint8Array([0x86, 0x8f])
    },
    {
      input: new Uint8Array([0x80, 0x00]),
      expectedOutput: new Uint8Array([0x80, 0x00])
    },
    {
      input: new Uint8Array([0x00, 0x00]),
      expectedOutput: new Uint8Array([0x00, 0x00])
    },
    {
      input: new Uint8Array([0xff, 0xff]),
      expectedOutput: new Uint8Array([0x00, 0x01])
    },
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var inputCopy = new Uint8Array(test.input);
    inputCopy = ByteUtil.twosComplement(inputCopy);
    t.deepEquals(inputCopy, test.expectedOutput, 'for input ' +
      ByteUtil.bytes2Hex(test.input) + ' expected ' +
      ByteUtil.bytes2Hex(test.expectedOutput) + ', but got ' +
      ByteUtil.bytes2Hex(inputCopy));
  }
  t.end();
});

test('decrement', function(t) {
  var tests = [
    {
      input: new Uint8Array([0x01]),
      expectedOutput: new Uint8Array([0x00])
    },
    {
      input: new Uint8Array([0x02]),
      expectedOutput: new Uint8Array([0x01])
    },
    {
      input: new Uint8Array([0x03]),
      expectedOutput: new Uint8Array([0x02])
    },
    {
      input: new Uint8Array([0x01, 0x01]),
      expectedOutput: new Uint8Array([0x01, 0x00])
    },
    {
      input: new Uint8Array([0x01, 0x00]),
      expectedOutput: new Uint8Array([0x00, 0xff])
    },
    {
      input: new Uint8Array([0x05, 0x00, 0x00]),
      expectedOutput: new Uint8Array([0x04, 0xff, 0xff])
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var inputCopy = new Uint8Array(test.input);
    inputCopy = ByteUtil.decrement(inputCopy);
    t.deepEquals(inputCopy, test.expectedOutput, 'for input ' +
      ByteUtil.bytes2Hex(test.input) + ' expected ' +
      ByteUtil.bytes2Hex(test.expectedOutput) + ', but got ' +
      ByteUtil.bytes2Hex(inputCopy));
  }
  t.end();
});

test('increment', function(t) {
  var tests = [
    {
      input: new Uint8Array([]),
      expectedOutput: new Uint8Array([0x01])
    },
    {
      input: new Uint8Array([0x00]),
      expectedOutput: new Uint8Array([0x01])
    },
    {
      input: new Uint8Array([0x01]),
      expectedOutput: new Uint8Array([0x02])
    },
    {
      input: new Uint8Array([0x02]),
      expectedOutput: new Uint8Array([0x03])
    },
    {
      input: new Uint8Array([0x01, 0x00]),
      expectedOutput: new Uint8Array([0x01, 0x01])
    },
    {
      input: new Uint8Array([0x00, 0xff]),
      expectedOutput: new Uint8Array([0x01, 0x0])
    },
    {
      input: new Uint8Array([0x80]),
      expectedOutput: new Uint8Array([0x81])
    },
    {
      input: new Uint8Array([0xff]),
      expectedOutput: new Uint8Array([0x01, 0x00])
    },
    {
      input: new Uint8Array([0x00, 0xff, 0xff]),
      expectedOutput: new Uint8Array([0x01, 0x00, 0x00])
    },
    {
      input: new Uint8Array([0xff, 0xff]),
      expectedOutput: new Uint8Array([0x01, 0x00, 0x00])
    },
    {
      input: new Uint8Array([0xff, 0x00, 0x00]),
      expectedOutput: new Uint8Array([0xff, 0x00, 0x01])
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var inputCopy = new Uint8Array(test.input);
    inputCopy = ByteUtil.increment(inputCopy);
    t.deepEquals(inputCopy, test.expectedOutput, 'for input ' +
      ByteUtil.bytes2Hex(test.input) + ' expected ' +
      ByteUtil.bytes2Hex(test.expectedOutput) + ', but got ' +
      ByteUtil.bytes2Hex(inputCopy));
  }
  t.end();
});

test('bytes2Hex and hex2Bytes', function(t) {
  var tests = [
    {
      bytes: new Uint8Array([]),
      hex: ''
    },
    {
      bytes: new Uint8Array([0x00]),
      hex: '00'
    },
    {
      bytes: new Uint8Array([0x01, 0x77, 0x09]),
      hex: '017709'
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var hex = ByteUtil.bytes2Hex(test.bytes);
    t.equals(hex, test.hex, 'expected ' + test.hex + ', but got ' + hex);

    var bytes = ByteUtil.hex2Bytes(test.hex);
    t.deepEquals(bytes, test.bytes, 'expected bytes[' +
      ByteUtil.bytes2Hex(test.bytes) + '], but got bytes[' +
      ByteUtil.bytes2Hex(bytes) +']');
  }
  t.end();
});
