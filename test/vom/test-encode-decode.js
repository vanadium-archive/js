// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests of VOM encoding and decoding.
 */

var test = require('prova');

var kind = require('./../../src/vdl/kind.js');
var registry = require('./../../src/vdl/registry.js');
var Type = require('./../../src/vdl/type.js');
var types = require('./../../src/vdl/types.js');
var typeUtil = require('./../../src/vdl/type-util.js');
var stringify = require('./../../src/vdl/stringify.js');
var canonicalize = require('./../../src/vdl/canonicalize.js');

var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer.js');
var ByteArrayMessageReader = require(
    './../../src/vom/byte-array-message-reader.js');

var Encoder = require('./../../src/vom/encoder.js');
var Decoder = require('./../../src/vom/decoder.js');

test('encode and decode', function(t) {
  var linkedListNodetype = {
    kind: kind.STRUCT,
    name: 'LinkedListNode',
    fields: [
      {
        name: 'Value',
        type: types.ANY
      },
      {
        name: 'Next'
      }
    ]
  };
  linkedListNodetype.fields[1].type = {
    kind: kind.OPTIONAL,
    elem: linkedListNodetype
  };

  var treeNodetype = new Type({
    kind: kind.STRUCT,
    name: 'TreeNodetype',
    fields: [
      {
        name: 'Value',
        type: types.ANY
      },
      {
        name: 'Left'
      },
      {
        name: 'Right'
      }
    ]
  });
  var nextTreeNodetype = new Type({
    kind: kind.OPTIONAL,
    elem: treeNodetype
  });
  treeNodetype.fields[1].type = nextTreeNodetype;
  treeNodetype.fields[2].type = nextTreeNodetype;

  // Define a type with _type on the prototype to test type look up in one of.
  function NamedUintConstructor(val) {
    this.val = val;
  }
  NamedUintConstructor.prototype._type = {
    kind: kind.UINT32,
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
      t: types.BYTE
    },
    {
      n: 'Decode(Encode(Uint16))',
      v:  1000,
      expectedOutput: {
        val:  1000
      },
      t: types.UINT16
    },
    {
      n: 'Decode(Encode(Float32))',
      v:  0.3,
      expectedOutput: {
        val:  0.3
      },
      t: types.FLOAT32
    },
    {
      n: 'Decode(Encode(Int32))',
      v:  -1,
      expectedOutput: {
        val:  -1
      },
      t: types.INT32
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
      t: types.COMPLEX64
    },
    {
      n: 'Decode(Encode(String))',
      v:  'a string',
      expectedOutput: {
        val:  'a string'
      },
      t: types.STRING
    },
    {
      n: 'Decode(Encode(Bool))',
      v:  true,
      expectedOutput: {
        val:  true
      },
      t: types.BOOL
    },
    {
      n: 'Decode(Encode(typeObject))',
      v: {
        kind: kind.LIST,
        name: 'A list',
        elem: types.STRING
      },
      expectedOutput: {
        kind: kind.LIST,
        name: 'A list',
        elem: types.STRING
      },
      t: types.TYPEOBJECT
    },
    {
      n: 'Decode(Encode(Struct{X: typeObject(nil)}))',
      v: {
        x: undefined
      },
      expectedOutput: {
        x: types.ANY
      },
      t: {
        kind: kind.STRUCT,
        fields: [
          {
            name: 'X',
            type: types.TYPEOBJECT
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
        kind: kind.STRUCT,
        fields: [
          {
            name: 'X',
            type: types.STRING
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
        kind: kind.LIST,
        elem: types.UINT32
      }
    },
    {
      n: 'Decode(Encode(Array<Int32>))',
      v:  [2, 3, 4],
      expectedOutput: {
        val:  [2, 3, 4]
      },
      t: {
        kind: kind.ARRAY,
        elem: types.INT32,
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
        kind: kind.LIST,
        elem: types.BYTE
      }
    },
    {
      n: 'Decode(Encode(Array<Byte>))',
      v:  new Uint8Array([0x80, 0x90]),
      expectedOutput: {
        val:  new Uint8Array([0x80, 0x90])
      },
      t: {
        kind: kind.ARRAY,
        elem: types.BYTE,
        len: 2
      }
    },
    {
      n: 'Decode(Encode(Set<String> as Object))',
      v:  {
        'b': true,
        'a': true
      },
      expectedOutput: {
        val:  new Set(['B', 'A'])
      },
      t: {
        kind: kind.SET,
        key: types.STRING
      },
    },
    {
      n: 'Decode(Encode(Set<Uint32> as Set))',
      v:  new Set([3, 5]),
      expectedOutput: {
        val:  new Set([3, 5])
      },
      t: {
        kind: kind.SET,
        key: types.UINT32
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
          ['Key1', 'value1'],
          ['Key2', 'value2']
        ]),
      },
      t: {
        kind: kind.MAP,
        key: types.STRING,
        elem: types.STRING
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
        kind: kind.MAP,
        key: types.UINT16,
        elem: types.FLOAT32
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
        kind: kind.STRUCT,
        name: 'testStruct',
        fields: [
          {
            name: 'Field1',
            type: types.UINT16
          },
          {
            name: 'Field2',
            type: types.STRING
          },
          {
            name: 'Field3',
            type: {
              kind: kind.LIST,
              elem: types.FLOAT64
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
        kind: kind.ENUM,
        name: 'enumtype',
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
        kind: kind.OPTIONAL,
        elem: types.STRING
      }
    },
    {
      n: 'Decode(Encode(Optional String w/ null))',
      v: null,
      expectedOutput: {
        val: null
      },
      t: {
        kind: kind.OPTIONAL,
        elem: types.STRING
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
        kind: kind.LIST,
        elem: types.ANY
      }
    },
    {
      n: 'Decode(Encode(Union<String, Uint16> w/ Uint16))',
      v: {
        'uInt': 5
      },
      t: {
        kind: kind.UNION,
        name: 'unionName',
        fields: [
          {
            name: 'StringInt',
            type: types.STRING
          },
          {
            name: 'UInt',
            type: types.UINT16
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
        kind: kind.UNION,
        name: 'unionName',
        fields: [
          {
            name: 'StringBool',
            type: types.STRING
          },
          {
            name: 'Boolean',
            type: types.BOOL
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
        kind: kind.UNION,
        name: 'UnionName',
        fields: [
          {
            name: 'StringBool',
            type: types.STRING
          },
          {
            name: 'Boolean',
            type: types.BOOL
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
        kind: kind.UNION,
        name: 'UnionName',
        fields: [
          {
            name: 'Map',
            type: {
              kind: kind.MAP,
              key: types.STRING,
              elem: types.UINT32
            }
          },
          {
            name: 'List',
            type: {
              kind: kind.LIST,
              elem: types.FLOAT64
            }
          }
        ]
      }
    },
    {
      n: 'Decode(Encode(Union<Map[Uint16]Uint32, List<Float64>> w/ Map))',
      v: {
        'map': {                   // This is a native object; the fields
          'a': 9,                  // are capitalized upon conversion to Map.
          'b': 10,
          _type: {
            kind: kind.MAP,
            key: types.STRING,
            elem: types.UINT32
          }
        }
      },
      t: {
        kind: kind.UNION,
        name: 'UnionName',
        fields: [
          {
            name: 'Map',
            type: {
              kind: kind.MAP,
              key: types.STRING,
              elem: types.UINT32
            }
          },
          {
            name: 'List',
            type: {
              kind: kind.LIST,
              elem: types.FLOAT64
            }
          }
        ]
      },
      expectedOutput: {
        'map': new Map([
          ['A', 9],
          ['B', 10]
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
      t: linkedListNodetype
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
      t: treeNodetype
    },
    {
      n: 'Decode(Encode(Any))',
      v: 5,
      expectedOutput: { // any with JSValue(number)
        val: 5
      },
      t: types.ANY
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
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - INT32 wrap',
      v: {
        val: 5,
        _type: types.INT32, // pretend this is on the prototype
        _wrappedType: true  // pretend this is on the prototype
      },
      expectedOutput: {
        val: {
          val: 5
        }
      },
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - Optional wrap',
      v: {
        val: 'not null',
        _type: {              // pretend this is on the prototype
          kind: kind.OPTIONAL,
          elem: types.STRING
        },
        _wrappedType: true    // pretend this is on the prototype
      },
      expectedOutput: {
        val: {
          val: 'not null'
        }
      },
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - Struct wrap',
      v: {
        a: 'abc',
        _type: {              // pretend this is on the prototype
          kind: kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: types.STRING
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: 'abc'
        }
      },
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any)) - Struct w/ Any wrap',
      v: {
        a: 'abc',
        _type: {              // pretend this is on the prototype
          kind: kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: types.ANY
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: 'abc'
        }
      },
      t: types.ANY
    },
    {
      n: 'Decode(Encode(JSValue w/ null))',
      expectedOutput: null,
      v: null,
      t: types.JSVALUE
    },
    {
      n: 'Decode(Encode(Any w/ null))',
      expectedOutput: {
        val: null
      },
      v: null,            // guesses to be a null of type ANY
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - wrapLike))',
      expectedOutput: {
        val: {
          val: null
        }
      },
      v: {
        val: null         // is not a null of type ANY; it's a struct
      },
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - ANY wrap',
      expectedOutput: {
        val: null
      },
      v: {
        val: null,
        _type: types.ANY,  // pretend this is on the prototype
        _wrappedType: true // pretend this is on the prototype
      },
      t: types.ANY
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
          kind: kind.OPTIONAL,
          elem: types.STRING
        },
        _wrappedType: true    // pretend this is on the prototype
      },
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - in a struct',
      v: {
        a: null,
        _type: {              // pretend this is on the prototype
          kind: kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: types.ANY
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: null
        }
      },
      t: types.ANY
    },
    {
      n: 'Decode(Encode(Any w/ null)) - wrapped null in a struct',
      v: {
        a: {
          val: null,
          _type: types.ANY,   // pretend this is on the prototype
          _wrappedType: true  // pretend this is on the prototype
        },
        _type: {              // pretend this is on the prototype
          kind: kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: types.ANY
            }
          ]
        }
      },
      expectedOutput: {
        val: {
          a: null
        }
      },
      t: types.ANY
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
        kind: kind.MAP,
        key: types.STRING,
        elem: {
          kind: kind.MAP,
          key: types.STRING,
          elem: types.ANY,
        },
      },
    },
    {
      n: 'Struct zero-values are filled post-decode',
      v: {
        c: true,
        _type: {
          kind: kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: types.UINT32
            },
            {
              name: 'B',
              type: types.STRING
            },
            {
              name: 'C',
              type: types.BOOL
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
        kind: kind.LIST,
        elem: {
          kind: kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: types.UINT32
            },
            {
              name: 'B',
              type: types.STRING
            },
            {
              name: 'C',
              type: types.BOOL
            }
          ]
        }
      }
    },
    {
      n: 'native string',
      v: 'hi',
      expectedOutput: 'hi'
    },
    {
      n: 'native number',
      v: 4,
      expectedOutput: 4
    },
    {
      n: 'native bool',
      v: true,
      expectedOutput: true
    },
    {
      n: 'native list',
      v: [{}, 'f', true],
      expectedOutput: [{}, 'f', true]
    },
    {
      n: 'native object',
      v: {
        a: 'three',
        A: 'THREE',
        b: 3
      },
      expectedOutput: {
        a: 'three',
        A: 'THREE',
        b: 3
      }
    },
    {
      n: 'native map',
      v: new Map([
        [null, 3],
        ['asdf', 'jkle']
      ]),
      expectedOutput: new Map([
        [null, 3],
        ['asdf', 'jkle']
      ])
    },
    {
      n: 'native set',
      v: new Set([null, 3, true, ['asdf', 'jkle']]),
      expectedOutput: new Set([null, 3, true, ['asdf', 'jkle']])
    },
    {
      n: 'typed string',
      v: new (registry.lookupOrCreateConstructor(types.STRING))(''),
      expectedOutput: new (registry.lookupOrCreateConstructor(types.STRING))('')
    },
    {
      n: 'typed number',
      v: new (registry.lookupOrCreateConstructor(types.INT16))(4),
      expectedOutput: new (registry.lookupOrCreateConstructor(types.INT16))(4)
    },
    {
      n: 'typed boolean',
      v: new (registry.lookupOrCreateConstructor(types.BOOL))(true),
      expectedOutput: new (registry.lookupOrCreateConstructor(types.BOOL))(true)
    },
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
    // Note that some results are native post-decode; if so, use types.JSVALUE.
    var resulttype = types.JSVALUE;
    if (typeUtil.isTyped(result)) {
      resulttype = result._type;
    }
    t.deepEqual(
      canonicalize.reduce(result, resulttype),
      expected,
      test.n + ' - decode value validation'
    );

    // If given a type, check that the decoded object's type matches it.
    // TODO(bprosnitz) Even if test.t isn't defined, we should still know what
    // the expected type ought to be.
    if (test.t) {
      var resulttypeStr = stringify(resulttype);
      var expectedtypeStr = stringify(canonicalize.type(test.t));
      t.equals(resulttypeStr, expectedtypeStr, test.n + ' - decode type match');
    }
  }
  t.end();
});

test('encode error cases', function(t) {
  var Str = registry.lookupOrCreateConstructor(types.STRING);
  var IntList = registry.lookupOrCreateConstructor(new Type({
    kind: kind.LIST,
    elem: types.INT16
  }));

  var tests = [
    {
      n: 'converting null to non-optional type',
      v: null,
      t: types.UINT64
    },
    {
      n: 'encoding float as int',
      v: 3.5,
      t: types.INT32
    },
    {
      n: 'converting string to complex type',
      v: 'a string cannot convert to Complex',
      t: types.COMPLEX64
    },
    {
      n: 'converting wrapped string to complex type',
      v: new Str('a string cannot convert to Complex'),
      t: types.COMPLEX64,
      e: 'are not compatible'
    },
    {
      n: 'using value as typeobject',
      v: [3, 4, 90],
      t: types.TYPEOBJECT
    },
    {
      n: 'using wrapped value as typeobject',
      v: new IntList([3, 4, 90]),
      t: types.TYPEOBJECT,
      e: 'are not compatible'
    },
    {
      n: 'using label not in enum',
      v: 'Thursday',
      t: {
        kind: kind.ENUM,
        labels: ['Sunday', 'Monday', 'Tuesday']
      }
    },
    {
      n: 'array size mismatch',
      v: [2, -4, 9, 34],
      t: {
        kind: kind.ARRAY,
        elem: types.INT16,
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
        kind: kind.SET,
        key: types.STRING
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
        kind: kind.SET,
        key: types.FLOAT64
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
        kind: kind.MAP,
        key: types.UINT32,
        elem: types.ANY
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
        kind: kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: types.INT16
          },
          {
            name: 'B',
            type: types.BYTE
          },
          {
            name: 'C',
            type: types.STRING
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
        kind: kind.UNION,
        fields: [
          {
            name: 'A',
            type: types.INT16
          },
          {
            name: 'B',
            type: types.BYTE
          },
          {
            name: 'C',
            type: types.STRING
          }
        ]
      }
    },
    {
      n: 'Union is not NoneOf',
      v: {},
      t: {
        kind: kind.UNION,
        fields: [
          {
            name: 'A',
            type: types.INT16
          },
          {
            name: 'B',
            type: types.BYTE
          },
          {
            name: 'C',
            type: types.STRING
          }
        ]
      }
    }
  ];

  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    var messageWriter = new ByteArrayMessageWriter();
    var encoder = new Encoder(messageWriter);
    t.throws(encoder.encode.bind(encoder, test.v, test.t),
      new RegExp('.*' + (test.e || '') + '.*'), test.n);
  }
  t.end();
});
