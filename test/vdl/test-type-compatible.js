// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for type conversion compatibility.
 */

var test = require('prova');

var kind = require('./../../src/vdl/kind.js');
var Type = require('./../../src/vdl/type.js');
var types = require('./../../src/vdl/types.js');
var typeCompatible = require('./../../src/vdl/type-compatible.js');

// This tests that any, optional, bool, typeobject, and number interconvert
// properly. Also checks the string, enum, []byte loop.
test('type compatibility tests - simple', function(t) {
  var tests = [
    {
      name: 'float and undefined',
      a: types.FLOAT64,
      b: undefined,
      expected: true
    },
    {
      name: 'any and bool',
      a: types.ANY,
      b: types.BOOL,
      expected: true
    },
    {
      name: 'bool and named bool',
      a: types.BOOL,
      b: new Type({
        kind: kind.BOOL,
        name: 'MBool'
      }),
      expected: true
    },
    {
      name: 'string and optional string',
      a: types.STRING,
      b: new Type({
        kind: kind.OPTIONAL,
        elem: types.STRING
      }),
      expected: true
    },
    {
      name: 'numbers',
      a: types.INT32,
      b: types.UINT16,
      expected: true
    },
    {
      name: 'type object and optional typeobject',
      a: types.TYPEOBJECT,
      b: new Type({
        kind: kind.OPTIONAL,
        elem: types.TYPEOBJECT
      }),
      expected: true
    },
    {
      name: 'type object and number',
      a: types.TYPEOBJECT,
      b: types.INT64,
      expected: false
    },
    {
      name: 'string and bool',
      a: types.STRING,
      b: types.BOOL,
      expected: false
    },
    {
      name: 'enum and string',
      a: new Type({
        kind: kind.ENUM,
        labels: []
      }),
      b: types.STRING,
      expected: true
    },
    {
      name: 'enum and []byte',
      a: new Type({
        kind: kind.ENUM,
        labels: []
      }),
      b: new Type({
        kind: kind.LIST,
        elem: types.BYTE
      }),
      expected: true
    },
    {
      name: 'number and composite',
      a: types.COMPLEX128,
      b: new Type({
        kind: kind.STRUCT,
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
      a: types.ANY,
      b: new Type({
        kind: kind.LIST,
        elem: types.INT16
      }),
      expected: true
    },
    {
      name: '[]bool and [x]bool',
      a: new Type({
        kind: kind.LIST,
        elem: types.BOOL,
        name: '[]bool'
      }),
      b: new Type({
        kind: kind.ARRAY,
        elem: types.BOOL,
        len: 3,
        name: '[3]bool'
      }),
      expected: true
    },
    {
      name: '[]bool and []string',
      a: new Type({
        kind: kind.LIST,
        elem: types.BOOL
      }),
      b: new Type({
        kind: kind.LIST,
        elem: types.STRING
      }),
      expected: false
    },
    {
      name: 'set[uint32] and []uint32',
      a: new Type({
        kind: kind.SET,
        key: types.UINT32
      }),
      b: new Type({
        kind: kind.LIST,
        elem: types.UINT32
      }),
      expected: false
    },
    {
      name: 'set[uint32] and map[uint32]bool',
      a: new Type({
        kind: kind.SET,
        key: types.UINT32
      }),
      b: new Type({
        kind: kind.MAP,
        key: types.UINT32,
        elem: types.BOOL
      }),
      expected: true
    },
    {
      name: 'struct with only int64 fields and map[string]int64',
      a: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: types.INT64
          },
          {
            name: 'B',
            type: types.INT64
          }
        ]
      }),
      b: new Type({
        kind: kind.MAP,
        key: types.STRING,
        elem: types.INT64
      }),
      expected: true
    },
    {
      name: 'struct with int64-compatible fields and map[string]int64',
      a: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: types.INT64
          },
          {
            name: 'B',
            type: types.COMPLEX64
          }
        ]
      }),
      b: new Type({
        kind: kind.MAP,
        key: types.STRING,
        elem: types.INT64
      }),
      expected: true
    },
    {
      name: 'struct with a non-int64-compatible field and map[string]int64',
      a: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'A',
            type: types.STRING
          },
          {
            name: 'B',
            type: types.COMPLEX64
          }
        ]
      }),
      b: new Type({
        kind: kind.MAP,
        key: types.STRING,
        elem: types.INT64
      }),
      expected: false
    },
    {
      name: 'empty struct with another struct',
      a: new Type({
        kind: kind.STRUCT,
        fields: []
      }),
      b: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'Not present',
            type: types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'empty struct with a map',
      a: new Type({
        kind: kind.STRUCT,
        fields: []
      }),
      b: new Type({
        kind: kind.MAP,
        key: types.STRING,
        elem: types.INT64
      }),
      expected: false
    },
    {
      name: 'struct with another struct (no matching fields)',
      a: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'Number',
            type: types.UINT32
          }
        ]
      }),
      b: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'String',
            type: types.STRING
          }
        ]
      }),
      expected: false
    },
    {
      name: 'union with another union (no matching fields)',
      a: new Type({
        kind: kind.UNION,
        fields: [
          {
            name: 'Number',
            type: types.UINT32
          }
        ]
      }),
      b: new Type({
        kind: kind.UNION,
        fields: [
          {
            name: 'String',
            type: types.STRING
          }
        ]
      }),
      expected: false
    },
    {
      name: 'struct with another struct (1 matching field)',
      a: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'Number',
            type: types.UINT32
          },
          {
            name: 'StringA',
            type: types.STRING
          }
        ]
      }),
      b: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'Number',
            type: types.INT64
          },
          {
            name: 'StringB',
            type: types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'union with another union (1 matching field)',
      a: new Type({
        kind: kind.UNION,
        fields: [
          {
            name: 'Number',
            type: types.UINT32
          },
          {
            name: 'StringA',
            type: types.STRING
          }
        ]
      }),
      b: new Type({
        kind: kind.UNION,
        fields: [
          {
            name: 'Number',
            type: types.INT64
          },
          {
            name: 'StringB',
            type: types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'map of composites and another struct of similar composites',
      a: new Type({
        kind: kind.MAP,
        key: new Type({
          kind: kind.STRING,
          name: 'Named string'
        }),
        elem: new Type({
          kind: kind.STRUCT,
          fields: [
            {
              name: 'A',
              type: types.INT32
            },
            {
              name: 'B',
              type: types.STRING
            }
          ]
        })
      }),
      b: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'StructField1', // string matches named string
            type: new Type({
              kind: kind.STRUCT,  // empty struct matches struct with A, B
              fields: []
            })
          },
          {
            name: 'StructField2', // string matches named string
            type: new Type({
              kind: kind.STRUCT,  // struct with A matches struct with A, B
              fields: [
                {
                  name: 'A',
                  type: types.BYTE
                },
                {
                  name: 'C',
                  type: types.FLOAT64
                }
              ]
            })
          },
          {
            name: 'StructField3', // string matches named string
            type: new Type({
              kind: kind.STRUCT,  // struct with A matches struct with A, B
              fields: [
                {
                  name: 'B',
                  type: new Type({
                    kind: kind.ENUM, // enum matches string
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
  recStruct.kind = kind.STRUCT;
  recStruct.name = 'recStruct';
  recStruct.fields = [
    {
      name: 'SelfPointer',
      type: recStruct
    }
  ];

  var recMap = new Type();
  recMap.kind = kind.MAP;
  recMap.name = 'recMap';
  recMap.key = types.STRING;
  recMap.elem = recMap;

  var tests = [
    {
      name: 'recursive struct and empty struct',
      a: recStruct,
      b: new Type({
        kind: kind.STRUCT,
        fields: []
      }),
      expected: true
    },
    {
      name: 'recursive struct and non-empty struct (cycle-detected)',
      a: recStruct,
      b: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'SelfPointer',
            type: types.STRING
          }
        ]
      }),
      expected: true
    },
    {
      name: 'recursive struct and non-empty struct (no matches)',
      a: recStruct,
      b: new Type({
        kind: kind.STRUCT,
        fields: [
          {
            name: 'NotSelfPointer',
            type: types.STRING
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
