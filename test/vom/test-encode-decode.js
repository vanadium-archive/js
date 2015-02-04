/**
 * @fileoverview Tests of VOM encoding and decoding.
 */

var test = require('prova');

var Complex = require('./../../src/vom/complex.js');
var Kind = require('./../../src/vom/kind.js');
var Type = require('./../../src/vom/type.js');
var Types = require('./../../src/vom/types.js');
var TypeUtil = require('./../../src/vom/type-util.js');
var stringify = require('./../../src/vom/stringify.js');
var canonicalize = require('./../../src/vom/canonicalize.js');

var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer.js');
var ByteArrayMessageReader = require(
    './../../src/vom/byte-array-message-reader.js');

var Encoder = require('./../../src/vom/encoder.js');
var Decoder = require('./../../src/vom/decoder.js');

test('encode and decode', function(t) {
  var linkedListNodeType = {
    kind: Kind.STRUCT,
    name: 'LinkedListNode',
    fields: [
      {
        name: 'Value',
        type: Types.ANY
      },
      {
        name: 'Next'
      }
    ]
  };
  linkedListNodeType.fields[1].type = {
    kind: Kind.OPTIONAL,
    elem: linkedListNodeType
  };

  var treeNodeType = new Type({
    kind: Kind.STRUCT,
    name: 'TreeNodeType',
    fields: [
      {
        name: 'Value',
        type: Types.ANY
      },
      {
        name: 'Left'
      },
      {
        name: 'Right'
      }
    ]
  });
  var nextTreeNodeType = new Type({
    kind: Kind.OPTIONAL,
    elem: treeNodeType
  });
  treeNodeType.fields[1].type = nextTreeNodeType;
  treeNodeType.fields[2].type = nextTreeNodeType;

  // Define a type with _type on the prototype to test type look up in one of.
  function NamedUintConstructor(val) {
    this.val = val;
  }
  NamedUintConstructor.prototype._type = {
    kind: Kind.UINT32,
    name: 'namedUint32'
  };
  NamedUintConstructor.prototype._wrappedType = true;

  var tests = [
    {
      n: 'Decode(Encode(Byte))',
      v:  1,
      expectedOutput: {
        val:  1
      },
      t: Types.BYTE
    },
    {
      n: 'Decode(Encode(Uint16))',
      v:  1000,
      expectedOutput: {
        val:  1000
      },
      t: Types.UINT16
    },
    {
      n: 'Decode(Encode(Float32))',
      v:  0.3,
      expectedOutput: {
        val:  0.3
      },
      t: Types.FLOAT32
    },
    {
      n: 'Decode(Encode(Int32))',
      v:  -1,
      expectedOutput: {
        val:  -1
      },
      t: Types.INT32
    },
    {
      n: 'Decode(Encode(Complex64))',
      v: {
        real: 1.9,
        imag: -0.4
      },
      expectedOutput: {
        val: {
          real: 1.9,
          imag: -0.4
        }
      },
      t: Types.COMPLEX64
    },
    {
      n: 'Decode(Encode(String))',
      v:  'a string',
      expectedOutput: {
        val:  'a string'
      },
      t: Types.STRING
    },
    {
      n: 'Decode(Encode(Bool))',
      v:  true,
      expectedOutput: {
        val:  true
      },
      t: Types.BOOL
    },
    {
      n: 'Decode(Encode(TypeObject))',
      v: {
        kind: Kind.LIST,
        name: 'A list',
        elem: Types.STRING
      },
      expectedOutput: {
        kind: Kind.LIST,
        name: 'A list',
        elem: Types.STRING
      },
      t: Types.TYPEOBJECT
    },
    {
      n: 'Decode(Encode(Struct{X: TypeObject(nil)}))',
      v: {
        x: undefined
      },
      expectedOutput: {
        x: Types.ANY
      },
      t: {
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'X',
            type: Types.TYPEOBJECT
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Struct w/ Private field))',
      v: {
        x: 'val',
        _privateField: 99
      },
      expectedOutput: {
        x: 'val'
      },
      t: {
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'X',
            type: Types.STRING
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Object w/ Private field [no type]))',
      v: {
        x: 'val',
        _privateField: 99
      },
      expectedOutput: {
        x: 'val'
      }
    },
    {
      n: 'Decode(Encode(List<Uint32>))',
      v:  [2, 3, 4],
      expectedOutput: {
        val:  [2, 3, 4]
      },
      t: {
        kind: Kind.LIST,
        elem: Types.UINT32
      }
    },
    {
      n: 'Decode(Encode(Array<Int32>))',
      v:  [2, 3, 4],
      expectedOutput: {
        val:  [2, 3, 4]
      },
      t: {
        kind: Kind.ARRAY,
        elem: Types.INT32,
        len: 3
      }
    },
    {
      n: 'Decode(Encode(List<Byte>))',
      v:  new Uint8Array([0x80, 0x90]),
      expectedOutput: {
        val:  new Uint8Array([0x80, 0x90])
      },
      t: {
        kind: Kind.LIST,
        elem: Types.BYTE
      }
    },
    {
      n: 'Decode(Encode(Array<Byte>))',
      v:  new Uint8Array([0x80, 0x90]),
      expectedOutput: {
        val:  new Uint8Array([0x80, 0x90])
      },
      t: {
        kind: Kind.ARRAY,
        elem: Types.BYTE,
        len: 2
      }
    },
    {
      n: 'Decode(Encode(Set<String> as Object))',
      v:  {
        'b' : true,
        'a': true
      },
      expectedOutput: {
        val:  new Set(['b', 'a'])
      },
      t: {
        kind: Kind.SET,
        key: Types.STRING
      },
    },
    {
      n: 'Decode(Encode(Set<Uint32> as Set))',
      v:  new Set([3, 5]),
      expectedOutput: {
        val:  new Set([3, 5])
      },
      t: {
        kind: Kind.SET,
        key: Types.UINT32
      }
    },
    {
      n: 'Decode(Encode(Map[String]String as Object))',
      v: {
        'key1': 'value1',
        'key2': 'value2'
      },
      expectedOutput: {
        val: new Map([
          ['key1', 'value1'],
          ['key2', 'value2']
        ]),
      },
      t: {
        kind: Kind.MAP,
        key: Types.STRING,
        elem: Types.STRING
      },
    },
    {
      n: 'Decode(Encode(Map[Uint16]Float32 as Map))',
      v: new Map([
        [3, 1.3],
        [2, -5.6]
      ]),
      expectedOutput: {
        val: new Map([
          [3, 1.3],
          [2, -5.6]
        ])
      },
      t: {
        kind: Kind.MAP,
        key: Types.UINT16,
        elem: Types.FLOAT32
      }
    },
    {
      n: 'Decode(Encode(Struct as Object))',
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
            name: 'Field1',
            type: Types.UINT16
          },
          {
            name: 'Field2',
            type: Types.STRING
          },
          {
            name: 'Field3',
            type: {
              kind: Kind.LIST,
              elem: Types.FLOAT64
            }
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Enum))',
      v: 'alabel',
      expectedOutput: {
        val: 'alabel'
      },
      t: {
        kind: Kind.ENUM,
        name: 'enumType',
        labels: ['alabel', 'blabel']
      }
    },
    {
      n: 'Decode(Encode(Optional String w/ value))',
      v: 'optionalString',
      expectedOutput: {
        val: 'optionalString'
      },
      t: {
        kind: Kind.OPTIONAL,
        elem: Types.STRING
      }
    },
    {
      n: 'Decode(Encode(Optional String w/ null))',
      v: null,
      expectedOutput: {
        val: null
      },
      t: {
        kind: Kind.OPTIONAL,
        elem: Types.STRING
      }
    },
    {
      n: 'Decode(Encode(Array<Byte>) w/o type)',
      v:  new Uint8Array([0x80, 0x90]),
      expectedOutput: new Uint8Array([0x80, 0x90])
    },
    {
      n: 'Decode(Encode(Bool w/o type))',
      v: true,
      expectedOutput: true
    },
    {
      n: 'Decode(Encode(Map w/o type))',
      v: new Map([
        ['x', [4, 5, 3]],
        ['y', 'test']
      ]),
      expectedOutput: new Map([
        ['x', [4, 5, 3]],
        ['y', 'test']
      ])
    },
    {
      n: 'Decode(Encode(Set w/o type))',
      v: new Set([3, 4, 0]),
      expectedOutput: new Set([3, 4, 0])
    },
    {
      n: 'Decode(Encode(Map w/o type))',
      v: new Map([
        ['string', false],
        [2, ['mixed', 3, 'list']]
      ]),
      expectedOutput: new Map([
        ['string', false],
        [2, ['mixed', 3, 'list']]
      ])
    },
    {
      n: 'Decode(Encode(Object w/o type))',
      v: {
        a: 'a',
        b: 3,
        c: true
      },
      expectedOutput: {
        a: 'a',
        b: 3,
        c: true
      }
    },
    {
      n: 'Decode(Encode(List))',
      v: [
        {
          aa: 2,
          bb: 3
        },
        'something else'
      ],
      expectedOutput: {
        val: [
          {
            aa: 2,
            bb: 3
          },
          'something else'
        ]
      },
      t: {
        kind: Kind.LIST,
        elem: Types.ANY
      }
    },
    {
      n: 'Decode(Encode(Union<String, Uint16> w/ Uint16))',
      v: {
        'uInt': 5
      },
      t: {
        kind: Kind.UNION,
        name: 'unionName',
        fields: [
          {
            name: 'StringInt',
            type: Types.STRING
          },
          {
            name: 'UInt',
            type: Types.UINT16
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Union<String, Bool> w/ String))',
      v: {
        'stringBool': 'str'
      },
      t: {
        kind: Kind.UNION,
        name: 'unionName',
        fields: [
          {
            name: 'StringBool',
            type: Types.STRING
          },
          {
            name: 'Boolean',
            type: Types.BOOL
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Union<String, Bool> w/ Bool))',
      v: {
        'boolean': true
      },
      t: {
        kind: Kind.UNION,
        name: 'UnionName',
        fields: [
          {
            name: 'StringBool',
            type: Types.STRING
          },
          {
            name: 'Boolean',
            type: Types.BOOL
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Union<Map[Uint16]Uint32, List<Float64>> w/ List))',
      v: {
        'list': [4,3,5]
      },
      t: {
        kind: Kind.UNION,
        name: 'UnionName',
        fields: [
          {
            name: 'Map',
            type: {
              kind: Kind.MAP,
              key: Types.STRING,
              elem: Types.UINT32
            }
          },
          {
            name: 'List',
            type: {
              kind: Kind.LIST,
              elem: Types.FLOAT64
            }
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Union<Map[Uint16]Uint32, List<Float64>> w/ Map))',
      v: {
        'map': {
          'a': 9,
          'b': 10,
          _type: {
            kind: Kind.MAP,
            key: Types.STRING,
            elem: Types.UINT32
          }
        }
      },
      t: {
        kind: Kind.UNION,
        name: 'UnionName',
        fields: [
          {
            name: 'Map',
            type: {
              kind: Kind.MAP,
              key: Types.STRING,
              elem: Types.UINT32
            }
          },
          {
            name: 'List',
            type: {
              kind: Kind.LIST,
              elem: Types.FLOAT64
            }
          }
        ]
      },
      expectedOutput: {
        'map': new Map([
          ['a', 9],
          ['b', 10]
        ])
      }
    },
    {
      n: 'Decode(Encode(Linked List Nodes))',
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
      expectedOutput: {
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
    },
    {
      n: 'Decode(Encode(Tree Nodes))',
      v: {
        value: 4,
        left: {
          value: 5,
          left: null,
          right: null
        },
        right: {
          value: false,
          left: {
            value: true,
            left: null,
            right: null
          },
          right: null
        }
      },
      expectedOutput: {
        value: 4,
        left: {
          value: 5,
          left: null,
          right: null
        },
        right: {
          value: false,
          left: {
            value: true,
            left: null,
            right: null
          },
          right: null
        }
      },
      t: treeNodeType
    },
    {
      n: 'Decode(Encode(Any))',
      v: 5,
      expectedOutput: { // any with JSValue(number)
        val: 5
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - wrapLike',
      v: {
        val: 5
      },
      expectedOutput: { // any with JSValue(object with field val: 5)
        val: {
          val: 5
        }
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - INT32 wrap',
      v: {
        val: 5,
        _type: Types.INT32, // pretend this is on the prototype
        _wrappedType: true  // pretend this is on the prototype
      },
      expectedOutput: {
        val: {
          val: 5
        }
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - Optional wrap',
      v: {
        val: 'not null',
        _type: {              // pretend this is on the prototype
          kind: Kind.OPTIONAL,
          elem: Types.STRING
        },
        _wrappedType: true    // pretend this is on the prototype
      },
      expectedOutput: {
        val: {
          val: 'not null'
        }
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - Struct wrap',
      v: {
        a: 'abc',
        _type: {              // pretend this is on the prototype
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.STRING
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: 'abc'
        }
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - Struct w/ Any wrap',
      v: {
        a: 'abc',
        _type: {              // pretend this is on the prototype
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.ANY
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: 'abc'
        }
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(JSValue w/ null))',
      expectedOutput: null,
      v: null,
      t: Types.JSVALUE
    },
    {
      n: 'Decode(Encode(Any w/ null))',
      expectedOutput: {
        val: null
      },
      v: null,            // guesses to be a null of Type ANY
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - wrapLike))',
      expectedOutput: {
        val: {
          val: null
        }
      },
      v: {
        val: null         // is not a null of Type ANY; it's a struct
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - ANY wrap',
      expectedOutput: {
        val: null
      },
      v: {
        val: null,
        _type: Types.ANY,  // pretend this is on the prototype
        _wrappedType: true // pretend this is on the prototype
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - OPTIONAL wrap',
      expectedOutput: {
        val: {
          val: null
        }
      },
      v: {
        val: null,
        _type: {              // pretend this is on the prototype
          kind: Kind.OPTIONAL,
          elem: Types.STRING
        },
        _wrappedType: true    // pretend this is on the prototype
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - in a struct',
      v: {
        a: null,
        _type: {              // pretend this is on the prototype
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.ANY
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: null
        }
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - wrapped null in a struct',
      v: {
        a: {
          val: null,
          _type: Types.ANY,   // pretend this is on the prototype
          _wrappedType: true  // pretend this is on the prototype
        },
        _type: {              // pretend this is on the prototype
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.ANY
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: null
        }
      },
      t: Types.ANY
    },
    {
      n: 'Decode(Encode(Map in Map))',
      expectedOutput: {
        val: new Map([
          [
            'testMethod',
            new Map([
              ['numInArgs', 3],
              ['numOutArgs', 3],
              ['isStreaming', false]
            ])
          ],
          [
            'testMethod2',
            new Map([
              ['numInArgs', 2],
              ['numOutArgs', 1],
              ['isStreaming', true]
            ])
          ]
        ])
      },
      v: new Map([
        [
          'testMethod',
          new Map([
            ['numInArgs', 3],
            ['numOutArgs', 3],
            ['isStreaming', false]
          ])
        ],
        [
          'testMethod2',
          new Map([
            ['numInArgs', 2],
            ['numOutArgs', 1],
            ['isStreaming', true]
          ])
        ]
      ]),
      t: {
        kind: Kind.MAP,
        key: Types.STRING,
        elem: {
          kind: Kind.MAP,
          key: Types.STRING,
          elem: Types.ANY,
        },
      },
    },
    {
      n: 'Struct zero-values are filled post-decode',
      v: {
        c: true,
        _type: {
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.UINT32
            },
            {
              name: 'B',
              type: Types.STRING
            },
            {
              name: 'C',
              type: Types.BOOL
            }
          ]
        }
      },
      expectedOutput: {
        a: 0,
        b: '',
        c: true
      }
    },
    {
      n: 'Internal struct zero-values are filled post-decode',
      v: [
        {
          c: true
        },
        {
          a: 3
        },
        {
          b: 'hello'
        },
        {
          a: 42,
          b: 'all here',
          c: false
        }
      ],
      expectedOutput: {
        val: [
          {
            a: 0,
            b: '',
            c: true
          },
          {
            a: 3,
            b: '',
            c: false
          },
          {
            a: 0,
            b: 'hello',
            c: false
          },
          {
            a: 42,
            b: 'all here',
            c: false
          }
        ]
      },
      t: {
        kind: Kind.LIST,
        elem: {
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.UINT32
            },
            {
              name: 'B',
              type: Types.STRING
            },
            {
              name: 'C',
              type: Types.BOOL
            }
          ]
        }
      }
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
    var resultStr = stringify(result);
    var expected = test.expectedOutput || test.v;
    var expectedStr = stringify(expected);
    t.equals(resultStr, expectedStr, test.n  + ' - decode value match');

    // Then validate that we were given a canonicalized value.
    // Note that some results are native post-decode; if so, use Types.JSVALUE.
    var resultType = Types.JSVALUE;
    if (TypeUtil.isTyped(result)) {
      resultType = result._type;
    }
    t.deepEqual(
      canonicalize.reduce(result, resultType),
      expected,
      test.n + ' - decode value validation'
    );

    // If given a type, check that the decoded object's type matches it.
    // TODO(bprosnitz) Even if test.t isn't defined, we should still know what
    // the expected type ought to be.
    if (test.t) {
      var resultTypeStr = stringify(resultType);
      var expectedTypeStr = stringify(canonicalize.type(test.t));
      t.equals(resultTypeStr, expectedTypeStr, test.n + ' - decode type match');
    }
  }
  t.end();
});

test('encode error cases', function(t) {
  var tests = [
    {
      n: 'converting null to non-optional type',
      v: null,
      t: Kind.UINT64
    },
    {
      n: 'encoding float as int',
      v: 3.5,
      t: Kind.INT32
    },
    {
      n: 'converting string to complex type',
      v: 'a string cannot convert to Complex',
      t: new Complex(42)
    },
    {
      n: 'using value as typeobject',
      v: [3, 4, 90],
      t: Types.TYPEOBJECT
    },
    {
      n: 'using label not in enum',
      v: 'Thursday',
      t: {
        kind: Kind.ENUM,
        labels: ['Sunday', 'Monday', 'Tuesday']
      }
    },
    {
      n: 'array size mismatch',
      v: [2, -4, 9, 34],
      t: {
        kind: Kind.ARRAY,
        elem: Types.INT16,
        len: 3
      }
    },
    {
      n: 'map does not convert to set',
      v: new Map([
        ['a', true],
        ['b', true],
        ['c', true]
      ]),
      t: {
        kind: Kind.SET,
        key: Types.STRING
      }
    },
    {
      n: 'object cannot be converted to non-string keyed sets',
      v: {
        a: true,
        b: true,
        c: true
      },
      t: {
        kind: Kind.SET,
        key: Types.FLOAT64
      }
    },
    {
      n: 'object cannot be converted to non-string keyed maps',
      v: {
        a: 3,
        b: true,
        c: 'asf'
      },
      t: {
        kind: Kind.MAP,
        key: Types.UINT32,
        elem: Types.ANY
      }
    },
    {
      n: 'extra struct entry', // TODO(alexfandrianto): Should we drop the field
      v: {                     // instead of throwing an error?
        a: 3,
        b: 0,
        c: 'asf',
        d: 'KABOOM! This cannot be here!'
      },
      t: {
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: Types.INT16
          },
          {
            name: 'B',
            type: Types.BYTE
          },
          {
            name: 'C',
            type: Types.STRING
          }
        ]
      }
    },
    {
      n: 'Union is not TwoOrMoreOf',
      v: {
        a: 3,
        c: 'asf'
      },
      t: {
        kind: Kind.UNION,
        fields: [
          {
            name: 'A',
            type: Types.INT16
          },
          {
            name: 'B',
            type: Types.BYTE
          },
          {
            name: 'C',
            type: Types.STRING
          }
        ]
      }
    },
    {
      n: 'Union is not Nunion',
      v: {},
      t: {
        kind: Kind.UNION,
        fields: [
          {
            name: 'A',
            type: Types.INT16
          },
          {
            name: 'B',
            type: Types.BYTE
          },
          {
            name: 'C',
            type: Types.STRING
          }
        ]
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var messageWriter = new ByteArrayMessageWriter();
    var encoder = new Encoder(messageWriter);
    t.throws(encoder.encode.bind(encoder, test.v, test.t), test.n);
  }
  t.end();
});
