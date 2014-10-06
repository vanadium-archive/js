/**
 * @fileoverview Tests of VOM encoding and decoding.
 */

var test = require('prova');

var Kind = require('./../../src/vom/kind.js');
var Types = require('./../../src/vom/types.js');
var stringify = require('./../../src/vom/stringify.js');

var ByteArrayMessageWriter = require(
    './../../src/vom/byte_array_message_writer.js');
var ByteArrayMessageReader = require(
    './../../src/vom/byte_array_message_reader.js');

var Encoder = require('./../../src/vom/encoder.js');
var Decoder = require('./../../src/vom/decoder.js');

test('encode and decode', function(t) {
  var linkedListNodeType = {
    kind: Kind.STRUCT,
    name: 'LinkedListNode',
    fields: [
      {
        name: 'value',
        type: Types.ANY
      },
      {
        name: 'next'
      }
    ]
  };
  linkedListNodeType.fields[1].type = {
    kind: Kind.NILABLE,
    elem: linkedListNodeType
  };

  var tests = [
    {
      v: 1,
      t: Types.BYTE
    },
    {
      v: 1000,
      t: Types.UINT16
    },
    {
      v: 0.3,
      t: Types.FLOAT32
    },
    {
      v: -1,
      t: Types.INT32
    },
    {
      v: {
        real: 1.9,
        imag: -0.4
      },
      t: Types.COMPLEX64
    },
    {
      v: 'a string',
      t: Types.STRING
    },
    {
      v: true,
      t: Types.BOOL
    },
    {
      v: {
        kind: Kind.LIST,
        name: 'A list',
        elem: Types.STRING
      },
      t: Types.TYPEVAL
    },
    {
      v: [2, 3, 4],
      t: {
        kind: Kind.LIST,
        elem: Types.UINT32
      }
    },
    {
      v: [2, 3, 4],
      t: {
        kind: Kind.ARRAY,
        elem: Types.INT32,
        len: 3
      }
    },
    {
      v: new Uint8Array([0x80, 0x90]),
      t: {
        kind: Kind.LIST,
        elem: Types.BYTE
      }
    },
    {
      v: new Uint8Array([0x80, 0x90]),
      t: {
        kind: Kind.ARRAY,
        elem: Types.BYTE,
        len: 2
      }
    },
    {
      v: {
        'b': null,
        'a': null
      },
      t: {
        kind: Kind.SET,
        key: Types.STRING
      }
    },
    {
      v: {
        'key1': 'value1',
        'key2': 'value2'
      },
      t: {
        kind: Kind.MAP,
        key: Types.STRING,
        elem: Types.STRING
      }
    },
    {
      v: {
        field1: 8,
        field2: 'str',
        field3: [4, 5]
      },
      t: {
        kind: Kind.STRUCT,
        name: 'testStruct',
        fields: [
          {
            name: 'field1',
            type: Types.UINT16
          },
          {
            name: 'field2',
            type: Types.STRING
          },
          {
            name: 'field3',
            type: {
              kind: Kind.LIST,
              elem: Types.FLOAT64
            }
          }
        ]
      }
    },
    {
      v: 'alabel',
      t: {
        kind: Kind.ENUM,
        name: 'enumType',
        labels: ['alabel', 'blabel']
      }
    },
    {
      v: 'nilableString',
      t: {
        kind: Kind.NILABLE,
        elem: Types.STRING
      }
    },
    {
      v: null,
      t: {
        kind: Kind.NILABLE,
        elem: Types.STRING
      }
    },
    {
      v: 5,
      t: Types.ANY
    },
    {
      v: true
    },
    {
      v: {
        x: [4, 5, 3],
        y: 'test'
      }
    },
    {
      v: [
        {
          '_type': {
            kind: Kind.MAP,
            key: Types.STRING,
            elem: Types.UINT16
          },
          'aa': 2,
          'bb': 3
        }
      ],
      t: {
        kind: Kind.LIST,
        elem: Types.ANY
      }
    },
    {
      v: 5,
      t: {
        kind: Kind.ONEOF,
        name: 'oneOfName',
        types: [Types.STRING, Types.UINT16]
      }
    },
    {
      v: 'str',
      t: {
        kind: Kind.ONEOF,
        name: 'oneOfName',
        types: [Types.STRING, Types.BOOL]
      }
    },
    {
      v: true,
      t: {
        kind: Kind.ONEOF,
        name: 'oneOfName',
        types: [Types.STRING, Types.BOOL]
      }
    },
    {
      v: [4,3,5],
      t: {
        kind: Kind.ONEOF,
        name: 'oneOfName',
        types: [
          {
            kind: Kind.MAP,
            key: Types.UINT16,
            elem: Types.UINT32
          },
          {
            kind: Kind.LIST,
            elem: Types.FLOAT64
          }
        ]
      }
    },
    {
      v: {
        'a': 9,
        'b': 10,
        _type: {
          kind: Kind.MAP,
          key: Types.STRING,
          elem: Types.UINT32
        }
      },
      t: {
        kind: Kind.ONEOF,
        name: 'oneOfName',
        types: [
          {
            kind: Kind.MAP,
            key: Types.STRING,
            elem: Types.UINT32
          },
          {
            kind: Kind.LIST,
            elem: Types.FLOAT64
          }
        ]
      }
    },
    {
      v: {
        value: 9,
        next: {
          value: 10,
          next: {
            value: 11,
            next: null
          }
        }
      },
      t: linkedListNodeType
    }
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];

    var messageWriter = new ByteArrayMessageWriter();
    var encoder = new Encoder(messageWriter);
    encoder.encode(test.v, test.t); // encode to messageWriter

    var messageReader = new ByteArrayMessageReader(messageWriter.getBytes());
    var decoder = new Decoder(messageReader);
    var result = decoder.decode(); // decode the written bytes

    // If the result is an Uint8Array, it could have been created
    // by calling subarray.  In node, this means that buffer points
    // the whole buffer, while the expected value only has buffer
    // contents for Uint8Array slice.  This causes the equality check
    // to fail.  To fix this, we create a new Uint8Array which provides
    // a pristine buffer with only the contents of the subarray.
    if (result instanceof Uint8Array) {
      result = new Uint8Array(result);
    }
    var resultStr = stringify(result);
    var expectedStr = stringify(test.v);
    t.equals(resultStr, expectedStr);
  }
  t.end();
});
