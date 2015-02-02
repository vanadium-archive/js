/**
 * @fileoverview Utility for converting from a Kind to a TypeObject.
 */

var Kind = require('./kind.js');
var Type = require('./type.js');
var Types = require('./types.js');

module.exports = typeObjectFromKind;

// All Types below are constructed with 'isValidated' set to true. This avoids a
// cyclic dependency with canonicalize.js and type.js.
var _primitiveTypeObject = new Type({
  name: 'PrimitiveTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    }
  ]
}, true);

var _optionalTypeObject = new Type({
  name: 'OptionalTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Elem',
      type: Types.TYPEOBJECT
    }
  ]
}, true);

var _enumTypeObject = new Type({
  name: 'EnumTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Labels',
      type: new Type({
        kind: Kind.LIST,
        elem: Types.STRING
      }, true)
    }
  ]
}, true);

var _listTypeObject = new Type({
  name: 'ListTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Elem',
      type: Types.TYPEOBJECT
    }
  ]
}, true);

var _arrayTypeObject = new Type({
  name: 'ArrayTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Elem',
      type: Types.TYPEOBJECT
    },
    {
      name: 'Len',
      type: Types.UINT32
    }
  ]
}, true);

var _setTypeObject = new Type({
  name: 'SetTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Key',
      type: Types.TYPEOBJECT
    }
  ]
}, true);

var _mapTypeObject = new Type({
  name: 'MapTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Key',
      type: Types.TYPEOBJECT
    },
    {
      name: 'Elem',
      type: Types.TYPEOBJECT
    }
  ]
}, true);

var _structTypeObject = new Type({
  name: 'StructTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Fields',
      type: new Type({
        kind: Kind.LIST,
        elem: new Type({
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'Name',
              type: Types.STRING
            },
            {
              name: 'Type',
              type: Types.TYPEOBJECT
            }
          ]
        }, true)
      }, true)
    }
  ]
}, true);

var _unionTypeObject = new Type({
  name: 'UnionTypeObject',
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: Types.UINT32
    },
    {
      name: 'Name',
      type: Types.STRING
    },
    {
      name: 'Fields',
      type: new Type({
        kind: Kind.LIST,
        elem: new Type({
          kind: Kind.STRUCT,
          fields: [
            {
              name: 'Name',
              type: Types.STRING
            },
            {
              name: 'Type',
              type: Types.TYPEOBJECT
            }
          ]
        }, true)
      }, true)
    }
  ]
}, true);

/**
 * Returns the corresponding type object for a given kind.
 * @param {Kind} k The kind.
 * @return {TypeObject} The corresponding type object.
 */
function typeObjectFromKind(k) {
  switch (k) {
    case Kind.BOOL:
    case Kind.BYTE:
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.UINT64:
    case Kind.INT16:
    case Kind.INT32:
    case Kind.INT64:
    case Kind.FLOAT32:
    case Kind.FLOAT64:
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
    case Kind.STRING:
    case Kind.ANY:
    case Kind.TYPEOBJECT:
      return _primitiveTypeObject;
    case Kind.NILABLE:
      return _optionalTypeObject;
    case Kind.ENUM:
      return _enumTypeObject;
    case Kind.LIST:
      return _listTypeObject;
    case Kind.ARRAY:
      return _arrayTypeObject;
    case Kind.SET:
      return _setTypeObject;
    case Kind.MAP:
      return _mapTypeObject;
    case Kind.STRUCT:
      return _structTypeObject;
    case Kind.ONEOF:
      return _unionTypeObject;
    default:
      throw new TypeError('Unknown kind ' + k);
  }
}