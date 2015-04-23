// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Utility for converting from a kind to a TypeObject.
 * @private
 */

var kind = require('./kind.js');
var Type = require('./type.js');
var types = require('./types.js');

module.exports = typeObjectFromkind;

// All Types below are constructed with 'isValidated' set to true. This avoids a
// cyclic dependency with canonicalize.js and type.js.
var _primitiveTypeObject = new Type({
  name: 'PrimitiveTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    }
  ]
}, true);

var _optionalTypeObject = new Type({
  name: 'OptionalTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Elem',
      type: types.TYPEOBJECT
    }
  ]
}, true);

var _enumTypeObject = new Type({
  name: 'EnumTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Labels',
      type: new Type({
        kind: kind.LIST,
        elem: types.STRING
      }, true)
    }
  ]
}, true);

var _listTypeObject = new Type({
  name: 'ListTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Elem',
      type: types.TYPEOBJECT
    }
  ]
}, true);

var _arrayTypeObject = new Type({
  name: 'ArrayTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Elem',
      type: types.TYPEOBJECT
    },
    {
      name: 'Len',
      type: types.UINT32
    }
  ]
}, true);

var _setTypeObject = new Type({
  name: 'SetTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Key',
      type: types.TYPEOBJECT
    }
  ]
}, true);

var _mapTypeObject = new Type({
  name: 'MapTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Key',
      type: types.TYPEOBJECT
    },
    {
      name: 'Elem',
      type: types.TYPEOBJECT
    }
  ]
}, true);

var _structTypeObject = new Type({
  name: 'StructTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Fields',
      type: new Type({
        kind: kind.LIST,
        elem: new Type({
          kind: kind.STRUCT,
          fields: [
            {
              name: 'Name',
              type: types.STRING
            },
            {
              name: 'Type',
              type: types.TYPEOBJECT
            }
          ]
        }, true)
      }, true)
    }
  ]
}, true);

var _unionTypeObject = new Type({
  name: 'UnionTypeObject',
  kind: kind.STRUCT,
  fields: [
    {
      name: 'Kind',
      type: types.UINT32
    },
    {
      name: 'Name',
      type: types.STRING
    },
    {
      name: 'Fields',
      type: new Type({
        kind: kind.LIST,
        elem: new Type({
          kind: kind.STRUCT,
          fields: [
            {
              name: 'Name',
              type: types.STRING
            },
            {
              name: 'Type',
              type: types.TYPEOBJECT
            }
          ]
        }, true)
      }, true)
    }
  ]
}, true);

/**
 * Returns the corresponding type object for a given kind.
 * @private
 * @param {kind} k The kind.
 * @return {TypeObject} The corresponding type object.
 */
function typeObjectFromkind(k) {
  switch (k) {
    case kind.BOOL:
    case kind.BYTE:
    case kind.UINT16:
    case kind.UINT32:
    case kind.UINT64:
    case kind.INT16:
    case kind.INT32:
    case kind.INT64:
    case kind.FLOAT32:
    case kind.FLOAT64:
    case kind.COMPLEX64:
    case kind.COMPLEX128:
    case kind.STRING:
    case kind.ANY:
    case kind.TYPEOBJECT:
      return _primitiveTypeObject;
    case kind.OPTIONAL:
      return _optionalTypeObject;
    case kind.ENUM:
      return _enumTypeObject;
    case kind.LIST:
      return _listTypeObject;
    case kind.ARRAY:
      return _arrayTypeObject;
    case kind.SET:
      return _setTypeObject;
    case kind.MAP:
      return _mapTypeObject;
    case kind.STRUCT:
      return _structTypeObject;
    case kind.UNION:
      return _unionTypeObject;
    default:
      throw new TypeError('Unknown kind ' + k);
  }
}
