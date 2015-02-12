/**
 * @fileoverview Tests for type conversion compatibility.
 */

var test = require('prova');

var Kind = require('./../../src/vom/kind.js');
var Type = require('./../../src/vom/type.js');
var Types = require('./../../src/vom/types.js');
var typeCompatible = require('./../../src/vom/type-compatible.js');

// This tests that any, optional, bool, typeobject, and number interconvert
// properly. Also checks the string, enum, []byte loop.
test('type compatibility tests - simple', function(t) {
  var tests = [
    {
      name: 'float and undefined',
      a: Types.FLOAT64,
      b: undefined,
      expected: true
    },
    {
      name: 'any and bool',
      a: Types.ANY,
      b: Types.BOOL,
      expected: true
    },
    {
      name: 'bool and named bool',
      a: Types.BOOL,
      b: new Type({
        kind: Kind.BOOL,
        name: 'MBool'
      }),
      expected: true
    },
    {
      name: 'string and optional string',
      a: Types.STRING,
      b: new Type({
        kind: Kind.OPTIONAL,
        elem: Types.STRING
      }),
      expected: true
    },
    {
      name: 'numbers',
      a: Types.INT32,
      b: Types.UINT16,
      expected: true
    },
    {
      name: 'type object and optional typeobject',
      a: Types.TYPEOBJECT,
      b: new Type({
        kind: Kind.OPTIONAL,
        elem: Types.TYPEOBJECT
      }),
      expected: true
    },
    {
      name: 'type object and number',
      a: Types.TYPEOBJECT,
      b: Types.INT64,
      expected: false
    },
    {
      name: 'string and bool',
      a: Types.STRING,
      b: Types.BOOL,
      expected: false
    },
    {
      name: 'enum and string',
      a: new Type({
        kind: Kind.ENUM,
        labels: []
      }),
      b: Types.STRING,
      expected: true
    },
    {
      name: 'enum and []byte',
      a: new Type({
        kind: Kind.ENUM,
        labels: []
      }),
      b: new Type({
        kind: Kind.LIST,
        elem: Types.BYTE
      }),
      expected: true
    },
    {
      name: 'number and composite',
      a: Types.COMPLEX128,
      b: new Type({
        kind: Kind.STRUCT,
        fields: []
      }),
      expected: false
    }
  ];

  tests.forEach(function(test) {
    t.equal(typeCompatible(test.a, test.b), test.expected, test.name +
      (test.expected ? ' are compatible' : ' are incompatible'));
  });
  t.end();
});


// This tests that array, list, set, map, struct, and union interconvert.
test('type compatibility tests - composite', function(t) {
  var tests = [
    {
      name: 'any and composite',
      a: Types.ANY,
      b: new Type({
        kind: Kind.LIST,
        elem: Types.INT16
      }),
      expected: true
    },
    {
      name: '[]bool and [x]bool',
      a: new Type({
        kind: Kind.LIST,
        elem: Types.BOOL,
        name: '[]bool'
      }),
      b: new Type({
        kind: Kind.ARRAY,
        elem: Types.BOOL,
        len: 3,
        name: '[3]bool'
      }),
      expected: true
    },
    {
      name: '[]bool and []string',
      a: new Type({
        kind: Kind.LIST,
        elem: Types.BOOL
      }),
      b: new Type({
        kind: Kind.LIST,
        elem: Types.STRING
      }),
      expected: false
    },
    {
      name: 'set[uint32] and []uint32',
      a: new Type({
        kind: Kind.SET,
        key: Types.UINT32
      }),
      b: new Type({
        kind: Kind.LIST,
        elem: Types.UINT32
      }),
      expected: false
    },
    {
      name: 'set[uint32] and map[uint32]bool',
      a: new Type({
        kind: Kind.SET,
        key: Types.UINT32
      }),
      b: new Type({
        kind: Kind.MAP,
        key: Types.UINT32,
        elem: Types.BOOL
      }),
      expected: true
    },
    {
      name: 'struct with only int64 fields and map[string]int64',
      a: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: Types.INT64
          },
          {
            name: 'B',
            type: Types.INT64
          }
        ]
      }),
      b: new Type({
        kind: Kind.MAP,
        key: Types.STRING,
        elem: Types.INT64
      }),
      expected: true
    },
    {
      name: 'struct with int64-compatible fields and map[string]int64',
      a: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: Types.INT64
          },
          {
            name: 'B',
            type: Types.COMPLEX64
          }
        ]
      }),
      b: new Type({
        kind: Kind.MAP,
        key: Types.STRING,
        elem: Types.INT64
      }),
      expected: true
    },
    {
      name: 'struct with a non-int64-compatible field and map[string]int64',
      a: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: Types.STRING
          },
          {
            name: 'B',
            type: Types.COMPLEX64
          }
        ]
      }),
      b: new Type({
        kind: Kind.MAP,
        key: Types.STRING,
        elem: Types.INT64
      }),
      expected: false
    },
    {
      name: 'empty struct with another struct',
      a: new Type({
        kind: Kind.STRUCT,
        fields: []
      }),
      b: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'Not present',
            type: Types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'empty struct with a map',
      a: new Type({
        kind: Kind.STRUCT,
        fields: []
      }),
      b: new Type({
        kind: Kind.MAP,
        key: Types.STRING,
        elem: Types.INT64
      }),
      expected: false
    },
    {
      name: 'struct with another struct (no matching fields)',
      a: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'Number',
            type: Types.UINT32
          }
        ]
      }),
      b: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'String',
            type: Types.STRING
          }
        ]
      }),
      expected: false
    },
    {
      name: 'union with another union (no matching fields)',
      a: new Type({
        kind: Kind.UNION,
        fields: [
          {
            name: 'Number',
            type: Types.UINT32
          }
        ]
      }),
      b: new Type({
        kind: Kind.UNION,
        fields: [
          {
            name: 'String',
            type: Types.STRING
          }
        ]
      }),
      expected: false
    },
    {
      name: 'struct with another struct (1 matching field)',
      a: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'Number',
            type: Types.UINT32
          },
          {
            name: 'StringA',
            type: Types.STRING
          }
        ]
      }),
      b: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'Number',
            type: Types.INT64
          },
          {
            name: 'StringB',
            type: Types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'union with another union (1 matching field)',
      a: new Type({
        kind: Kind.UNION,
        fields: [
          {
            name: 'Number',
            type: Types.UINT32
          },
          {
            name: 'StringA',
            type: Types.STRING
          }
        ]
      }),
      b: new Type({
        kind: Kind.UNION,
        fields: [
          {
            name: 'Number',
            type: Types.INT64
          },
          {
            name: 'StringB',
            type: Types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'map of composites and another struct of similar composites',
      a: new Type({
        kind: Kind.MAP,
        key: new Type({
          kind: Kind.STRING,
          name: 'Named string'
        }),
        elem: new Type({
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: Types.INT32
            },
            {
              name: 'B',
              type: Types.STRING
            }
          ]
        })
      }),
      b: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'StructField1', // string matches named string
            type: new Type({
              kind: Kind.STRUCT,  // empty struct matches struct with A, B
              fields: []
            })
          },
          {
            name: 'StructField2', // string matches named string
            type: new Type({
              kind: Kind.STRUCT,  // struct with A matches struct with A, B
              fields: [
                {
                  name: 'A',
                  type: Types.BYTE
                },
                {
                  name: 'C',
                  type: Types.FLOAT64
                }
              ]
            })
          },
          {
            name: 'StructField3', // string matches named string
            type: new Type({
              kind: Kind.STRUCT,  // struct with A matches struct with A, B
              fields: [
                {
                  name: 'B',
                  type: new Type({
                    kind: Kind.ENUM, // enum matches string
                    labels: []
                  })
                }
              ]
            })
          }
        ]
      }),
      expected: true
    }
  ];

  tests.forEach(function(test) {
    t.equal(typeCompatible(test.a, test.b), test.expected, test.name +
      (test.expected ? ' are compatible' : ' are incompatible'));
  });
  t.end();
});

// This tests recursive types. It's complex to setup, so there are fewer.
test('type compatibility tests - recursive', function(t) {
  var recStruct = new Type();
  recStruct.kind = Kind.STRUCT;
  recStruct.name = 'recStruct';
  recStruct.fields = [
    {
      name: 'SelfPointer',
      type: recStruct
    }
  ];

  var recMap = new Type();
  recMap.kind = Kind.MAP;
  recMap.name = 'recMap';
  recMap.key = Types.STRING;
  recMap.elem = recMap;

  var tests = [
    {
      name: 'recursive struct and empty struct',
      a: recStruct,
      b: new Type({
        kind: Kind.STRUCT,
        fields: []
      }),
      expected: true
    },
    {
      name: 'recursive struct and non-empty struct (cycle-detected)',
      a: recStruct,
      b: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'SelfPointer',
            type: Types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'recursive struct and non-empty struct (no matches)',
      a: recStruct,
      b: new Type({
        kind: Kind.STRUCT,
        fields: [
          {
            name: 'NotSelfPointer',
            type: Types.STRING
          }
        ]
      }),
      expected: false
    },
    {
      name: 'recursive struct with a recursive map[string]itself',
      a: recStruct,
      b: recMap,
      expected: true
    }
  ];

  tests.forEach(function(test) {
    t.equal(typeCompatible(test.a, test.b), test.expected, test.name +
      (test.expected ? ' are compatible' : ' are incompatible'));
  });
  t.end();
});