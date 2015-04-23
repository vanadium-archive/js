// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var kind = require('./../../src/vdl/kind.js');
var Type = require('./../../src/vdl/type.js');
var types = require('./../../src/vdl/types.js');

var recursiveType = new Type();
recursiveType.kind = kind.LIST;
recursiveType.name = 'recList';
recursiveType.elem = recursiveType;

var secondLevelRecursiveTypeA = new Type();
secondLevelRecursiveTypeA.kind = kind.SET;
secondLevelRecursiveTypeA.name = 'recSet';
var secondLevelRecursiveTypeB = new Type();
secondLevelRecursiveTypeB.name = 'recArray';
secondLevelRecursiveTypeB.kind = kind.ARRAY;
secondLevelRecursiveTypeB.len = 4;
secondLevelRecursiveTypeB.elem = secondLevelRecursiveTypeA;
secondLevelRecursiveTypeA.key = secondLevelRecursiveTypeB;

var tests = [
  {
    type: types.ANY,
    toString: 'any'
  },
  {
    type: types.BOOL,
    toString: 'bool'
  },
  {
    type: types.BYTE,
    toString: 'byte'
  },
  {
    type: types.UINT16,
    toString: 'uint16'
  },
  {
    type: types.UINT32,
    toString: 'uint32'
  },
  {
    type: types.UINT64,
    toString: 'uint64'
  },
  {
    type: types.INT16,
    toString: 'int16'
  },
  {
    type: types.INT32,
    toString: 'int32'
  },
  {
    type: types.INT64,
    toString: 'int64'
  },
  {
    type: types.FLOAT32,
    toString: 'float32'
  },
  {
    type: types.FLOAT64,
    toString: 'float64'
  },
  {
    type: types.COMPLEX64,
    toString: 'complex64'
  },
  {
    type: types.COMPLEX128,
    toString: 'complex128'
  },
  {
    type: types.STRING,
    toString: 'string'
  },
  {
    type: types.TYPEOBJECT,
    toString: 'typeobject'
  },
  {
    type: {
      kind: kind.BOOL,
      name: 'Boolean'
    },
    toString: 'Boolean bool'
  },
  {
    type: {
      kind: kind.ENUM,
      name: 'EnumName',
      labels: ['labelOne', 'labelTwo']
    },
    toString: 'EnumName enum{labelOne;labelTwo}'
  },
  {
    type: {
      kind: kind.ARRAY,
      name: 'namedArray',
      elem: {
        kind: kind.STRING,
        name: 'namedString'
      },
      len: 10
    },
    toString: 'namedArray [10]namedString string'
  },
  {
    type: {
      kind: kind.LIST,
      name: 'namedList',
      elem: {
        kind: kind.UINT16,
        name: 'namedUint16'
      }
    },
    toString: 'namedList []namedUint16 uint16'
  },
  {
    type: {
      kind: kind.SET,
      name: 'setName',
      key: {
        kind: kind.UINT32,
        name: 'namedUint32'
      }
    },
    toString: 'setName set[namedUint32 uint32]'
  },
  {
    type: {
      kind: kind.MAP,
      name: 'mapName',
      key: {
        kind: kind.INT16,
        name: 'namedInt16'
      },
      elem: {
        kind: kind.INT32,
        name: 'namedInt32'
      }
    },
    toString: 'mapName map[namedInt16 int16]namedInt32 int32'
  },
  {
    type: {
      kind: kind.STRUCT,
      name: 'structName',
      fields: [
        {
          name: 'FirstField',
          type: types.STRING
        },
        {
          name: 'SecondField',
          type: {
            name: 'innerList',
            kind: kind.LIST,
            elem: types.INT16
          }
        }
      ]
    },
    toString:
      'structName struct{FirstField string;SecondField innerList []int16}'
  },
  {
    type: {
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
            name: 'innerSet',
            kind: kind.SET,
            key: types.BOOL
          }
        }
      ]
    },
    toString: 'unionName union{A int16;B innerSet set[bool]}'
  },
  {
    type: {
      name: 'shouldNotBeNamed', // NOTE: Optional should normally not be named.
      kind: kind.OPTIONAL,
      elem: types.UINT64
    },
    toString: 'shouldNotBeNamed ?uint64'
  },
  {
    type: recursiveType,
    toString: 'recList []recList'
  },
  {
    type: secondLevelRecursiveTypeA,
    toString: 'recSet set[recArray [4]recSet]'
  },
  {
    type: secondLevelRecursiveTypeB,
    toString: 'recArray [4]recSet set[recArray]'
  }
];

module.exports = tests;
