var Kind = require('./../../src/vom/kind.js');
var Type = require('./../../src/vom/type.js');
var Types = require('./../../src/vom/types.js');

var recursiveType = new Type();
recursiveType.kind = Kind.LIST;
recursiveType.name = 'recList';
recursiveType.elem = recursiveType;

var secondLevelRecursiveTypeA = new Type();
secondLevelRecursiveTypeA.kind = Kind.SET;
secondLevelRecursiveTypeA.name = 'recSet';
var secondLevelRecursiveTypeB = new Type();
secondLevelRecursiveTypeB.name = 'recArray';
secondLevelRecursiveTypeB.kind = Kind.ARRAY;
secondLevelRecursiveTypeB.len = 4;
secondLevelRecursiveTypeB.elem = secondLevelRecursiveTypeA;
secondLevelRecursiveTypeA.key = secondLevelRecursiveTypeB;

var tests = [
  {
    type: Types.ANY,
    toString: 'any'
  },
  {
    type: Types.BOOL,
    toString: 'bool'
  },
  {
    type: Types.BYTE,
    toString: 'byte'
  },
  {
    type: Types.UINT16,
    toString: 'uint16'
  },
  {
    type: Types.UINT32,
    toString: 'uint32'
  },
  {
    type: Types.UINT64,
    toString: 'uint64'
  },
  {
    type: Types.INT16,
    toString: 'int16'
  },
  {
    type: Types.INT32,
    toString: 'int32'
  },
  {
    type: Types.INT64,
    toString: 'int64'
  },
  {
    type: Types.FLOAT32,
    toString: 'float32'
  },
  {
    type: Types.FLOAT64,
    toString: 'float64'
  },
  {
    type: Types.COMPLEX64,
    toString: 'complex64'
  },
  {
    type: Types.COMPLEX128,
    toString: 'complex128'
  },
  {
    type: Types.STRING,
    toString: 'string'
  },
  {
    type: Types.TYPEOBJECT,
    toString: 'typeobject'
  },
  {
    type: {
      kind: Kind.BOOL,
      name: 'Boolean'
    },
    toString: 'Boolean bool'
  },
  {
    type: {
      kind: Kind.ENUM,
      name: 'EnumName',
      labels: ['labelOne', 'labelTwo']
    },
    toString: 'EnumName enum{labelOne;labelTwo}'
  },
  {
    type: {
      kind: Kind.ARRAY,
      name: 'namedArray',
      elem: {
        kind: Kind.STRING,
        name: 'namedString'
      },
      len: 10
    },
    toString: 'namedArray [10]namedString string'
  },
  {
    type: {
      kind: Kind.LIST,
      name: 'namedList',
      elem: {
        kind: Kind.UINT16,
        name: 'namedUint16'
      }
    },
    toString: 'namedList []namedUint16 uint16'
  },
  {
    type: {
      kind: Kind.SET,
      name: 'setName',
      key: {
        kind: Kind.UINT32,
        name: 'namedUint32'
      }
    },
    toString: 'setName set[namedUint32 uint32]'
  },
  {
    type: {
      kind: Kind.MAP,
      name: 'mapName',
      key: {
        kind: Kind.INT16,
        name: 'namedInt16'
      },
      elem: {
        kind: Kind.INT32,
        name: 'namedInt32'
      }
    },
    toString: 'mapName map[namedInt16 int16]namedInt32 int32'
  },
  {
    type: {
      kind: Kind.STRUCT,
      name: 'structName',
      fields: [
        {
          name: 'FirstField',
          type: Types.STRING
        },
        {
          name: 'SecondField',
          type: {
            name: 'innerList',
            kind: Kind.LIST,
            elem: Types.INT16
          }
        }
      ]
    },
    toString:
      'structName struct{FirstField string;SecondField innerList []int16}'
  },
  {
    type: {
      kind: Kind.ONEOF,
      name: 'oneOfName',
      fields: [
        {
          name: 'A',
          type: Types.INT16
        },
        {
          name: 'B',
          type: {
            name: 'innerSet',
            kind: Kind.SET,
            key: Types.BOOL
          }
        }
      ]
    },
    toString: 'oneOfName union{A int16;B innerSet set[bool]}'
  },
  {
    type: {
      name: 'shouldNotBeNamed', // NOTE: Nilable should normally not be named.
      kind: Kind.NILABLE,
      elem: Types.UINT64
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
