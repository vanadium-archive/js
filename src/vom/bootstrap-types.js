/**
 * @fileoverview Defines the set of initially known bootstrap type ids and their
 * corresponding VDL type.
 */

module.exports = {
  definitions: undefined,
  idToType: idToType,
  typeToId: typeToId,
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

var Kind = require('../vdl/kind.js');
var stringify = require('../vdl/stringify.js');
var Types = require('../vdl/types.js');
var wiretype = require('../v.io/core/veyron2/vom');
var unwrap = require('../vdl/type-util').unwrap;

var stringList = {
  name: '',
  kind: Kind.LIST,
  elem: Types.STRING
};

var bootstrapTypes = {
  ANY: {
    id: unwrap(wiretype.WireIDAny).toNativeNumberApprox(),
    type: Types.ANY
  },
  BOOL: {
    id: unwrap(wiretype.WireIDBool).toNativeNumberApprox(),
    type: Types.BOOL
  },
  STRING: {
    id: unwrap(wiretype.WireIDString).toNativeNumberApprox(),
    type: Types.STRING
  },
  BYTE: {
    id: unwrap(wiretype.WireIDByte).toNativeNumberApprox(),
    type: Types.BYTE
  },
  UINT16: {
    id: unwrap(wiretype.WireIDUint16).toNativeNumberApprox(),
    type: Types.UINT16
  },
  UINT32: {
    id: unwrap(wiretype.WireIDUint32).toNativeNumberApprox(),
    type: Types.UINT32
  },
  UINT64: {
    id: unwrap(wiretype.WireIDUint64).toNativeNumberApprox(),
    type: Types.UINT64
  },
  INT16: {
    id: unwrap(wiretype.WireIDInt16).toNativeNumberApprox(),
    type: Types.INT16
  },
  INT32: {
    id: unwrap(wiretype.WireIDInt32).toNativeNumberApprox(),
    type: Types.INT32
  },
  INT64: {
    id: unwrap(wiretype.WireIDInt64).toNativeNumberApprox(),
    type: Types.INT64
  },
  FLOAT32: {
    id: unwrap(wiretype.WireIDFloat32).toNativeNumberApprox(),
    type: Types.FLOAT32
  },
  FLOAT64: {
    id: unwrap(wiretype.WireIDFloat64).toNativeNumberApprox(),
    type: Types.FLOAT64
  },
  COMPLEX64: {
    id: unwrap(wiretype.WireIDComplex64).toNativeNumberApprox(),
    type: Types.COMPLEX64
  },
  COMPLEX128: {
    id: unwrap(wiretype.WireIDComplex128).toNativeNumberApprox(),
    type: Types.COMPLEX128
  },
  LIST_BYTE: {
    id: unwrap(wiretype.WireIDByteList).toNativeNumberApprox(),
    type: {
      name: '',
      kind: Kind.LIST,
      elem: Types.BYTE
    }
  },
  TYPEOBJECT: {
    id: unwrap(wiretype.WireIDTypeObject).toNativeNumberApprox(),
    type: Types.TYPEOBJECT
  },
  LIST_STRING: {
    id: unwrap(wiretype.WireIDStringList).toNativeNumberApprox(),
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
 * @param {Type} type The type to search for.
 * @return {number} The bootstrap id or undefined if no boostrap type is found.
 */
function typeToId(type) {
  return typeToIdMap[stringify(type)];
}

/**
 * ID to type looks up the boostrap type for a given ID.
 * @param {number} id The id of the boostrap type.
 * @return {Type} The bootstrap type or undefined if no boostrap type is found.
 */
function idToType(id) {
  return idToTypeMap[id];
}
