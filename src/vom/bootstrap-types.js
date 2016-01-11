// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Defines the set of initially known bootstrap type ids and their
 * corresponding VDL type.
 * @private
 */

module.exports = {
  definitions: undefined,
  idToType: idToType,
  typeToId: typeToId,
  typeStringToId: typeStringToId,
  unionIds: {
    NAMED_TYPE: 0,
    ENUM_TYPE: 1,
    ARRAY_TYPE: 2,
    LIST_TYPE: 3,
    SET_TYPE: 4,
    MAP_TYPE: 5,
    STRUCT_TYPE: 6,
    UNION_TYPE: 7,
    OPTIONAL_TYPE: 8,
  }
};

var kind = require('../vdl/kind.js');
var stringify = require('../vdl/stringify.js');
var types = require('../vdl/types.js');
var wiretype = require('../gen-vdl/v.io/v23/vom');
var unwrap = require('../vdl/type-util').unwrap;

var stringList = {
  name: '',
  kind: kind.LIST,
  elem: types.STRING
};

var bootstrapTypes = {
  ANY: {
    id: unwrap(wiretype.WireIdAny).toNativeNumberApprox(),
    type: types.ANY
  },
  BOOL: {
    id: unwrap(wiretype.WireIdBool).toNativeNumberApprox(),
    type: types.BOOL
  },
  STRING: {
    id: unwrap(wiretype.WireIdString).toNativeNumberApprox(),
    type: types.STRING
  },
  BYTE: {
    id: unwrap(wiretype.WireIdByte).toNativeNumberApprox(),
    type: types.BYTE
  },
  UINT16: {
    id: unwrap(wiretype.WireIdUint16).toNativeNumberApprox(),
    type: types.UINT16
  },
  UINT32: {
    id: unwrap(wiretype.WireIdUint32).toNativeNumberApprox(),
    type: types.UINT32
  },
  UINT64: {
    id: unwrap(wiretype.WireIdUint64).toNativeNumberApprox(),
    type: types.UINT64
  },
  INT8: {
    id: unwrap(wiretype.WireIdInt8).toNativeNumberApprox(),
    type: types.INT8
  },
  INT16: {
    id: unwrap(wiretype.WireIdInt16).toNativeNumberApprox(),
    type: types.INT16
  },
  INT32: {
    id: unwrap(wiretype.WireIdInt32).toNativeNumberApprox(),
    type: types.INT32
  },
  INT64: {
    id: unwrap(wiretype.WireIdInt64).toNativeNumberApprox(),
    type: types.INT64
  },
  FLOAT32: {
    id: unwrap(wiretype.WireIdFloat32).toNativeNumberApprox(),
    type: types.FLOAT32
  },
  FLOAT64: {
    id: unwrap(wiretype.WireIdFloat64).toNativeNumberApprox(),
    type: types.FLOAT64
  },
  COMPLEX64: {
    id: unwrap(wiretype.WireIdComplex64).toNativeNumberApprox(),
    type: types.COMPLEX64
  },
  COMPLEX128: {
    id: unwrap(wiretype.WireIdComplex128).toNativeNumberApprox(),
    type: types.COMPLEX128
  },
  LIST_BYTE: {
    id: unwrap(wiretype.WireIdByteList).toNativeNumberApprox(),
    type: {
      name: '',
      kind: kind.LIST,
      elem: types.BYTE
    }
  },
  TYPEOBJECT: {
    id: unwrap(wiretype.WireIdTypeObject).toNativeNumberApprox(),
    type: types.TYPEOBJECT
  },
  LIST_STRING: {
    id: unwrap(wiretype.WireIdStringList).toNativeNumberApprox(),
    type: stringList
  },
};
module.exports.definitions = bootstrapTypes;

var typeToIdMap = {};
var idToTypeMap = {};
for (var key in bootstrapTypes) {
  if (!bootstrapTypes.hasOwnProperty(key)) {
    continue;
  }
  var bootstrapType = bootstrapTypes[key];
  idToTypeMap[bootstrapType.id] = bootstrapType.type;
  typeToIdMap[stringify(bootstrapType.type)] =
    bootstrapType.id;
}

/**
 * Type to ID finds the bootstrap id for a type.
 * @private
 * @param {Type} type The type to search for.
 * @return {number} The bootstrap id or undefined if no boostrap type is found.
 */
function typeToId(type) {
  return typeToIdMap[stringify(type)];
}

/**
 * Type to ID finds the bootstrap id for a type.
 * @private
 * @param {Type} type The type to search for.
 * @return {number} The bootstrap id or undefined if no boostrap type is found.
 */
function typeStringToId(typeStr) {
  return typeToIdMap[typeStr];
}



/**
 * ID to type looks up the boostrap type for a given ID.
 * @private
 * @param {number} id The id of the boostrap type.
 * @return {Type} The bootstrap type or undefined if no boostrap type is found.
 */
function idToType(id) {
  return idToTypeMap[id];
}
