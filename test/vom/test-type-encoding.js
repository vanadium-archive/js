// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for TypeEncoder and TypeDecoder.
 */

var test = require('prova');

var stringify = require('./../../src/vdl/stringify.js');
var types = require('./../../src/vdl/types.js');
var kind = require('./../../src/vdl/kind.js');

var TypeEncoder = require('./../../src/vom/type-encoder.js');
var TypeDecoder = require('./../../src/vom/type-decoder.js');

var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer.js');
var RawVomReader = require('./../../src/vom/raw-vom-reader.js');

/**
 * Type message reader reads type messages from the provided data.
 * @param {Uint8Array} bytes The input data.
 * @constructor
 */
function TypeMessageReader(bytes) {
  this.rawReader = new RawVomReader(bytes);
  var header = this.rawReader._readRawBytes(1);
  if (header[0] !== 0x80) {
    throw new Error('Improperly formatted bytes. Must start with 0x80');
  }
}

/**
 * Read the next type message.
 */
TypeMessageReader.prototype.nextMessage = function(typeDecoder) {
  var typeId;
  try {
    typeId = this.rawReader.readInt();
  } catch (error) {
    // Hopefully EOF.
    // TODO(bprosnitz) Make this a more accurate check.
    return null;
  }
  if (typeId < 0) {
    var len = this.rawReader.readUint();
    var body = this.rawReader._readRawBytes(len);
    return {
      typeId: -typeId,
      messageBytes: body
    };
  }
  throw new Error('Value messages not implemented.');
};

test('type encoding encode and decode (optional fields filled)', function(t) {
  var tests = require('../vdl/type-test-cases.js');

  for (var i = 0; i < tests.length; i++) {
    encodeDecodeType(t, tests[i].type);
  }
  t.end();
});

test('type encoding encode and decode (optional fields omitted)',
  function(t) {
  var tests = [
    {
      test: {
        kind: kind.OPTIONAL,
        elem: types.UINT64
      },
      expected: {
        name: '',
        kind: kind.OPTIONAL,
        elem: types.UINT64
      },
    },
    {
      test: {
        kind: kind.LIST,
        elem: {
          kind: kind.UINT16,
          name: 'namedUint16'
        }
      },
      expected: {
        kind: kind.LIST,
        name: '',
        elem: {
          kind: kind.UINT16,
          name: 'namedUint16'
        }
      }
    },
    {
      test: {
        kind: kind.UNION,
        name: 'unionName',
        fields: [
          {
            name: 'A',
            type: types.INT16
          },
          {
            name: 'B',
            type: {
              kind: kind.SET,
              key: types.BOOL
            }
          }
        ]
      },
      expected: {
        kind: kind.UNION,
        name: 'unionName',
        fields: [
          {
            name: 'A',
            type: types.INT16
          },
          {
            name: 'B',
            type: {
              name: '',
              kind: kind.SET,
              key: types.BOOL
            }
          }
        ]
      },
    },
    {
      test: {
        kind: kind.MAP,
        key: {
          kind: kind.INT16,
          name: 'namedInt16'
        },
        elem: {
          kind: kind.INT32,
          name: 'namedInt32'
        }
      },
      expected: {
        kind: kind.MAP,
        name: '',
        key: {
          kind: kind.INT16,
          name: 'namedInt16'
        },
        elem: {
          kind: kind.INT32,
          name: 'namedInt32'
        }
      },
    }
  ];

  for (var j = 0; j < tests.length; j++) {
    encodeDecodeType(t, tests[j].test, tests[j].expected);
  }
  t.end();
});

var UPPER_LOOP_LIMIT = 100;
function encodeDecodeType(t, test, expected) {
  // If the expected result is not given, use the test value instead.
  expected = expected || test;

  var writer = new ByteArrayMessageWriter();
  var typeEncoder = new TypeEncoder();
  var id = typeEncoder.encodeType(writer, test);

  var typeDecoder = new TypeDecoder();
  var reader = new TypeMessageReader(writer.getBytes());
  for (var j = 0; j < UPPER_LOOP_LIMIT; j++) {
    var message = reader.nextMessage();
    if (message === null) {
      break;
    }
    typeDecoder.defineType(message.typeId, message.messageBytes);
  }
  if (j === UPPER_LOOP_LIMIT) {
    t.fail('read too many messages');
  }

  var resultType = typeDecoder.lookupType(id);
  var resultStr = stringify(resultType);
  var expectedStr = stringify(expected);
  t.equals(resultStr, expectedStr);
}

// This tests a subset of potential type encoding errors.
test('type encoding encode errors', function(t) {
  var badTypes = {
    'no type': undefined,
    'no kind': {},
    'invalid kind': {
      kind: 'non-integer'
    },
    'unknown kind': {
      kind: -1
    },
    'list w/ bad elem': {
      kind: kind.LIST,
      name: 'testList',
      elem: true
    },
    'array w/ bad len': {
      kind: kind.ARRAY,
      name: 'testArray',
      elem: types.UINT64,
      len: -1
    },
    'set w/ labels': {
      kind: kind.SET,
      key: types.ANY,
      labels: ['labels', 'are', 'for', 'enums', 'only']
    },
    'enum w/ non-string labels': {
      kind: kind.ENUM,
      labels: ['do not', 'put a number in', 'the enum labels', 3]
    },
    'union w/o fields': {
      kind: kind.UNION,
      fields: []
    }
  };

  for (var testName in badTypes) {
    if (badTypes.hasOwnProperty(testName)) {
      var test = badTypes[testName];

      var writer = new ByteArrayMessageWriter();
      var typeEncoder = new TypeEncoder();
      t.throws(
        typeEncoder.encodeType.bind(typeEncoder, writer, test),
        testName
      );
    }
  }
  t.end();
});
