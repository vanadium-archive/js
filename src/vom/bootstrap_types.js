/**
 * @fileoverview Defines the set of initially known bootstrap type ids and their
 * corresponding VDL type.
 */

module.exports = {
  definitions: undefined,
  idToType: idToType,
  typeToId: typeToId
};

var Kind = require('./kind.js');
var stringify = require('./stringify.js');
var Types = require('./types.js');

var typeValList = {
  kind: Kind.LIST,
  elem: Types.TYPEVAL
};
var stringList = {
  kind: Kind.LIST,
  elem: Types.STRING
};
var wireField = {
  kind: Kind.STRUCT,
  fields: [
    {
      name: 'name',
      type: Types.STRING
    },
    {
      name: 'type',
      type: Types.TYPEVAL
    }
  ]
};
var wireFieldList = {
  kind: Kind.LIST,
  elem: wireField
};

var bootstrapTypes = {
  ANY: {
    id: 1, type: Types.ANY
  },
  TYPEVAL: {
    id: 2, type: Types.TYPEVAL
  },
  BOOL: {
    id: 3, type: Types.BOOL
  },
  STRING: {
    id: 4, type: Types.STRING
  },
  BYTE: {
    id: 5, type: Types.BYTE
  },
  UINT16: {
    id: 6, type: Types.UINT16
  },
  UINT32: {
    id: 7, type: Types.UINT32
  },
  UINT64: {
    id: 8, type: Types.UINT64
  },
  INT16: {
    id: 9, type: Types.INT16
  },
  INT32: {
    id: 10, type: Types.INT32
  },
  INT64: {
    id: 11, type: Types.INT64
  },
  FLOAT32: {
    id: 12, type: Types.FLOAT32
  },
  FLOAT64: {
    id: 13, type: Types.FLOAT64
  },
  COMPLEX64: {
    id: 14, type: Types.COMPLEX64
  },
  COMPLEX128: {
    id: 15, type: Types.COMPLEX128
  },

  WIRENAMED: {
    id: 16,
    type: {
      kind: Kind.STRUCT,
      name: 'WireNamed',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'base',
          type: Types.TYPEVAL
        }
      ]
    }
  },
  WIREENUM: {
    id: 17,
    type: {
      kind: Kind.STRUCT,
      name: 'WireEnum',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'labels',
          type: stringList
        }
      ]
    }
  },
  WIREARRAY: {
    id: 18,
    type: {
      kind: Kind.STRUCT,
      name: 'WireArray',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'elem',
          type: Types.TYPEVAL
        },
        {
          name: 'len',
          type: Types.UINT64
        }
      ]
    }
  },
  WIRELIST: {
    id: 19,
    type: {
      kind: Kind.STRUCT,
      name: 'WireList',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'elem',
          type: Types.TYPEVAL
        }
      ]
    }
  },
  WIRESET: {
    id: 20,
    type: {
      kind: Kind.STRUCT,
      name: 'WireSet',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'key',
          type: Types.TYPEVAL
        }
      ]
    }
  },
  WIREMAP: {
    id: 21,
    type: {
      kind: Kind.STRUCT,
      name: 'WireMap',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'key',
          type: Types.TYPEVAL
        },
        {
          name: 'elem',
          type: Types.TYPEVAL
        }
      ]
    }
  },
  WIRESTRUCT: {
    id: 22,
    type: {
      kind: Kind.STRUCT,
      name: 'WireStruct',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'fields',
          type: wireFieldList
        }
      ]
    }
  },
  WIREFIELD: {
    id: 23, type: wireField
  },
  WIREFIELDLIST: {
    id: 24, type: wireFieldList
  },
  WIREONEOF: {
    id: 25,
    type: {
      kind: Kind.STRUCT,
      name: 'WireOneOf',
      fields: [
        {
          name: 'name',
          type: Types.STRING
        },
        {
          name: 'fields',
          type: typeValList
        }
      ]
    }
  },

  LIST_BYTE: {
    id: 26,
    type: {
      kind: Kind.LIST,
      type: Types.BYTE
    }
  },
  LIST_STRING: {
    id: 27,
    type: stringList
  },
  LIST_TYPEID: {
    id: 28,
    type: typeValList
  },

  // TODO(bprosnitz) Nilable format not finished
  WIRENILABLE: {
    id: 29,
    type: {
      kind: Kind.STRUCT,
      name: 'WireNilable',
      fields: [
        {
          name: 'elem',
          type: Types.TYPEVAL
        }
      ]
    }
  }
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