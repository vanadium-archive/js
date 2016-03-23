// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for TypeEncoder and TypeDecoder.
 */

var test = require('tape');

var stringify = require('./../../src/vdl/stringify.js');
var types = require('./../../src/vdl/types.js');
var kind = require('./../../src/vdl/kind.js');
var wiretype = require('../../src/gen-vdl/v.io/v23/vom');
var Promise = require('./../../src/lib/promise');

var TypeEncoder = require('./../../src/vom/type-encoder.js');
var TypeDecoder = require('./../../src/vom/type-decoder.js');

var ByteMessageWriter = require(
    './../../src/vom/byte-message-writer.js');
var RawVomReader = require('./../../src/vom/raw-vom-reader.js');

/**
 * Type message reader reads type messages from the provided data.
 * @param {Uint8Array} bytes The input data.
 * @constructor
 */
function TypeMessageReader(bytes) {
  var header = bytes[0];
  this.rawReader = new RawVomReader(bytes);
  // consume the header byte.
  this.rawReader._readRawBytes(1);
  if (header !== 0x80 && header !== 0x81) {
    throw new Error('Improperly formatted bytes. Must start with 0x80 or 0x81');
  }
}

/**
 * Read the next type message.
 */
TypeMessageReader.prototype.nextMessage = function(typeDecoder) {
  var reader = this;
  return reader.rawReader.tryReadControlByte().then(function(ctrl) {
    // NOTE: In the tests using this reader, types are read in order. This
    // could potentially lead to hangs but doesn't because of the particular
    // test cases chosen. This isn't an issue and in the non-test implementation
    // because the type building algorithm is different.
    // TODO(bprosnitz) The tests should probably be changed to reuse the
    // same type building logic of the implementation in the future.
    if (ctrl && ctrl !== wiretype.WireCtrlTypeIncomplete.val) {
      throw new Error('received unknown control byte: 0x' + ctrl.toString(16));
    }
    return reader.rawReader.readInt();
  }).then(function(typeId) {
    if (typeId >= 0) {
      throw new Error('Value messages not implemented.');
    }
    return reader.rawReader.readUint().then(function(len) {
      return reader.rawReader._readRawBytes(len);
    }).then(function(bytes) {
      return {
        typeId: -typeId,
        messageBytes: bytes,
      };
    });
  }, function(err) {
    return null;
  });
};

test('type encoding encode and decode (optional fields filled)', function(t) {
  var tests = require('../vdl/type-test-cases.js');
  var promises = [];
  for (var i = 0; i < tests.length; i++) {
    promises.push(encodeDecodeType(t, tests[i].type));
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
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

  var promises = [];
  for (var i = 0; i < tests.length; i++) {
    promises.push(encodeDecodeType(t, tests[i].test, tests[i].expected));
  }
  Promise.all(promises).then(function() {
    t.end();
  }, t.end);
});

var UPPER_LOOP_LIMIT = 100;
function encodeDecodeType(t, test, expected) {
  // If the expected result is not given, use the test value instead.
  expected = expected || test;

  var writer = new ByteMessageWriter();
  var typeEncoder = new TypeEncoder(writer);
  var id = typeEncoder.encodeType(test);

  var typeDecoder = new TypeDecoder();
  var reader = new TypeMessageReader(writer.getBytes());
  var j = 1;
  return readMessage();
  function readMessage() {
    return reader.nextMessage().then(function(message) {
      if (message === null) {
        return typeDecoder.lookupType(id).then(function(resultType) {
          var resultStr = stringify(resultType);
          var expectedStr = stringify(expected);
          return t.equals(resultStr, expectedStr);
        });
      }
      if (j === UPPER_LOOP_LIMIT) {
        return t.fail('read too many messages');
      }
      j++;
      return typeDecoder.defineType(message.typeId, message.messageBytes).
        then(readMessage);
    });
  }
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

      var writer = new ByteMessageWriter();
      var typeEncoder = new TypeEncoder(writer);
      t.throws(
        typeEncoder.encodeType.bind(typeEncoder, test),
        testName
      );
    }
  }
  t.end();
});
