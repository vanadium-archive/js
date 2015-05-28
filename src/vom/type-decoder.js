// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Type decoder handles decoding types from a VOM stream by
 * looking up by id.
 *
 * Definitions:
 * Type / Defined Type - The standard VOM JavaScript type object representation.
 * Partial Type - The type representation off the wire, identical to defined
 * types but child types are described by type ids rather than actual complete
 * type objects.
 *
 * Overview:
 * Type decoders hold a cache of decoded types. Types are read off the wire in
 * defineType() and then lazily converted from partial to defined types when
 * they are needed in lookupType().
 * @private
 */

module.exports = TypeDecoder;

/**
 * Create a TypeDecoder.
 * This holds the set of cached types and assists in decoding.
 * @constructor
 * @private
 */
function TypeDecoder() {
  this._definedTypes = {};
  // Partial types are similar to definedTypes but have type ids for child
  // types rather than fully defined type structures.
  this._partialTypes = {};
  this._waiters = {};
}

var kind = require('../vdl/kind.js');
var Type = require('../vdl/type.js');
var BootstrapTypes = require('./bootstrap-types.js');
var RawVomReader = require('./raw-vom-reader.js');
var unwrap = require('../vdl/type-util').unwrap;
var wiretype = require('../gen-vdl/v.io/v23/vom');
var promiseFor = require('../lib/async-helper').promiseFor;
var promiseWhile = require('../lib/async-helper').promiseWhile;
var Promise = require('../lib/promise');
var Deferred = require('../lib/deferred');

var endByte = unwrap(wiretype.WireCtrlEnd);

TypeDecoder.prototype._tryLookupType = function(typeId) {
  if (typeId < 0) {
    throw new Error('invalid negative type id.');
  }

  var type = BootstrapTypes.idToType(typeId);
  if (type !== undefined) {
    return type;
  }

  return this._definedTypes[typeId];
};

/**
 * Looks up a type in the decoded types cache by id.
 * @param {number} typeId The type id.
 * @return {Promise<Type>} The decoded type or undefined.
 */
TypeDecoder.prototype.lookupType = function(typeId) {
  try {
    var type = this._tryLookupType(typeId);
    if (type) {
      return Promise.resolve(type);
    }
  } catch(e) {
    return Promise.reject(e);
  }
  if (this._partialTypes.hasOwnProperty(typeId)) {
    this._tryBuildPartialType(typeId, this._partialTypes[typeId]);
    return Promise.resolve(this._definedTypes[typeId]);
  }
  this._waiters[typeId] = this._waiters[typeId] || new Deferred();
  return this._waiters[typeId].promise;
};

/**
 * Add a new type definition to the type cache.
 * @param {number} typeId The id of the type.
 * @param {Promise<Uint8Array>} The raw bytes that describe the type structure.
 */
TypeDecoder.prototype.defineType = function(typeId, messageBytes) {
  if (typeId < 0) {
    throw new Error('invalid negative type id ' + typeId + '.');
  }
  if (this._definedTypes[typeId] !== undefined ||
    this._partialTypes[typeId] !== undefined) {
    throw new Error('Cannot redefine type with id ' + typeId);
  }

  // Read the type in and add it to the partial type set.
  var td = this;
  return this._readPartialType(messageBytes).then(function(type) {
    td._partialTypes[typeId] = type;
    // If there was another caller waiting on this partialTypeId,
    // then we fully build the type and wake up all the waiters.
    var def = td._waiters[typeId];
    if (def) {
      try {
        td._tryBuildPartialType(typeId, td._partialTypes[typeId]);
        def.resolve(td._definedTypes[typeId]);
      } catch(e) {
        def.reject(e);
      }
      delete td._waiters[typeId];
    }
  });
};

/**
 * Flattens the type's dependencies into a typeId->(type, partial type) map.
 * @private
 * @throws {Error} If the type's dependencies are not available.
 */
TypeDecoder.prototype._flattenTypeDepGraph = function(typeId, typeDeps) {
  // Already in map?
  if (typeDeps[typeId] !== undefined) {
    return;
  }
  // Already defined?
  if (this._tryLookupType(typeId) !== undefined) {
    return;
  }
  // Allocate a type for the partial type.
  if (!this._partialTypes.hasOwnProperty(typeId)) {
    throw new Error('Type definition with ID ' + typeId +
      ' not received.');
  }
  var partialType = this._partialTypes[typeId];
  typeDeps[typeId] = {
    partialType: partialType,
    type: new Type()
  };

  // Recurse.
  if (partialType.namedTypeId !== undefined) {
    this._flattenTypeDepGraph(partialType.namedTypeId, typeDeps);
  }
  if (partialType.keyTypeId !== undefined) {
    this._flattenTypeDepGraph(partialType.keyTypeId, typeDeps);
  }
  if (partialType.elemTypeId !== undefined) {
    this._flattenTypeDepGraph(partialType.elemTypeId, typeDeps);
  }
  var i;
  if (partialType.typeIds !== undefined) {
    for (i = 0; i < partialType.typeIds.length; i++) {
      this._flattenTypeDepGraph(partialType.typeIds[i], typeDeps);
    }
  }
  if (partialType.fields !== undefined) {
    for (i = 0; i < partialType.fields.length; i++) {
      this._flattenTypeDepGraph(partialType.fields[i].typeId, typeDeps);
    }
  }
};

/**
 * Tries to build a partial type into a type.
 * This has two steps:
 * 1. Allocate type objects for all dependencies
 * 2. Copy the type and replace the type id with the created types.
 * 3. Copy named types and change the name.
 */
TypeDecoder.prototype._tryBuildPartialType = function(typeId) {
  if (!this._partialTypes.hasOwnProperty(typeId)) {
    throw new Error('Type definition with ID ' + typeId +
      ' not received.');
  }
  var partialType = this._partialTypes[typeId];

  var flattenedTypes = {};
  this._flattenTypeDepGraph(typeId, flattenedTypes);

  var self = this;
  var getType = function(id) {
    var type = self._tryLookupType(id);
    if (type !== undefined) {
      return type;
    }
    type = flattenedTypes[id].type;
    if (type !== undefined) {
      return type;
    }
    throw new Error('Type unexpectedly undefined.');
  };

  var id;
  var type;
  var i;
  // All dependencies are ready. Build the type.
  for (id in flattenedTypes) {
    if (!flattenedTypes.hasOwnProperty(id)) {
      continue;
    }
    partialType = flattenedTypes[id].partialType;
    type = flattenedTypes[id].type;

    if (partialType.namedTypeId !== undefined) {
      // Handle named types in a second pass because it involves copying.
      continue;
    }

    type.kind = partialType.kind;
    if (partialType.name !== undefined) {
      type.name = partialType.name;
    }
    if (partialType.labels !== undefined) {
      type.labels = partialType.labels;
    }
    if (partialType.len !== undefined) {
      type.len = partialType.len;
    }

    if (partialType.keyTypeId !== undefined) {
      type.key = getType(partialType.keyTypeId);
    }
    if (partialType.elemTypeId !== undefined) {
      type.elem = getType(partialType.elemTypeId);
    }
    if (partialType.typeIds !== undefined) {
      type.types = new Array(partialType.typeIds.length);
      for (i = 0; i < partialType.typeIds.length; i++) {
        type.types[i] = getType(partialType.typeIds[i]);
      }
    }
    if (partialType.fields !== undefined) {
      type.fields = new Array(partialType.fields.length);
      for (i = 0; i < partialType.fields.length; i++) {
        var partialField = partialType.fields[i];
        type.fields[i] = {
          name: partialField.name,
          type: getType(partialField.typeId)
        };
      }
    }
  }

  // Now handle named types.
  for (id in flattenedTypes) {
    if (flattenedTypes.hasOwnProperty(id)) {
      partialType = flattenedTypes[id].partialType;
      type = flattenedTypes[id].type;

      if (partialType.namedTypeId !== undefined) {
        // Special case for named types.
        var toCopy = getType(partialType.namedTypeId);
        for (var fieldName in toCopy) {
          if (toCopy.hasOwnProperty(fieldName)) {
            type[fieldName] = toCopy[fieldName];
          }
        }
        type.name = partialType.name;
      }
    }
  }

  // Now that the types are all prepared, make them immutable.
  for (id in flattenedTypes) {
    if (flattenedTypes.hasOwnProperty(id)) {
      type = flattenedTypes[id].type;

      // Make the type immutable, setting its _unique string too.
      type.freeze();

      // Define the type.
      this._definedTypes[id] = type;

      // Remove the type from the partial type set.
      delete this._partialTypes[id];
    }
  }
};

/**
 * Reads a type off of the wire.
 * @param {RawVomReader} reader The reader with the data
 * @param {module:vanadium.vdl.kind} kind The kind that is being read.
 * @param {string} wireName The name of the type.  This is used to generate
 * error messages
 * @param {object[]} indexMap An array of options specifying how to read the
 * fields of the type object.  The index in the array is the index in the wire
 * structure for the wire type.  Each object in the array should have a key
 * field which is the name of the field in the wire struct and a fn field with
 * a function that will be called with this set to reader and returns a promise
 * with its value.  For instance:<br>
 * <pre>[{key: 'name', fn: reader.readString)}]</pre>
 * <br>
 * Means the value at index 0 will correspond to the name field and should
 * be read by reader.readString
 * @returns {Promise<object>} A promise with the constructed wire type as the
 * result.
 */
TypeDecoder.prototype._readTypeHelper = function(
  reader, kind, wireName, indexMap) {
  var partialType = {
    name: '',
  };
  if (kind) {
    partialType.kind = kind;
  }

  function notEndByte() {
    return reader.tryReadControlByte().then(function(b) {
      if (b === endByte) {
        return false;
      }

      if (b !== null) {
        return Promise.reject('Unknown control byte ' + b);
      }
      return true;
    });
  }

  function readField() {
    var entry;
    return reader.readUint().then(function(nextIndex) {
      entry = indexMap[nextIndex];
      if (!entry) {
        throw Error('Unexpected index for ' + wireName + ': ' + nextIndex);
      }
      return entry.fn.bind(reader)();
    }).then(function(val) {
      partialType[entry.key] = val;
    });
  }
  return promiseWhile(notEndByte, readField).then(function() {
    return partialType;
  });
};

TypeDecoder.prototype._readNamedType = function(reader) {
  return this._readTypeHelper(reader, null, 'WireNamed', [
    {key: 'name', fn: reader.readString },
    {key: 'namedTypeId', fn: reader.readUint },
  ]);
};

TypeDecoder.prototype._readEnumType = function(reader) {
  var labels = [];
  var i = 0;
  return this._readTypeHelper(reader, kind.ENUM, 'WireEnum',[
    { key: 'name', fn: reader.readString },
    { key: 'labels', fn: readLabels },
  ]);
  function readLabels() {
    return reader.readUint().then(function(length) {
      labels = new Array(length);
      return reader.readString().then(handleLabel);
    });
  }
  function handleLabel(s) {
    labels[i] = s;
    i++;
    if (i < labels.length) {
      return reader.readString().then(handleLabel);
    }
    return labels;
  }
};

TypeDecoder.prototype._readArrayType = function(reader) {
  return this._readTypeHelper(reader, kind.ARRAY, 'WireArray', [
    {key: 'name', fn: reader.readString },
    {key: 'elemTypeId', fn: reader.readUint },
    {key: 'len', fn: reader.readUint },
  ]);
};

TypeDecoder.prototype._readListType = function(reader) {
  return this._readTypeHelper(reader, kind.LIST, 'WireList', [
    {key: 'name', fn: reader.readString },
    {key: 'elemTypeId', fn: reader.readUint },
  ]);
};

TypeDecoder.prototype._readOptionalType = function(reader) {
  return this._readTypeHelper(reader, kind.OPTIONAL, 'WireList', [
    {key: 'name', fn: reader.readString },
    {key: 'elemTypeId', fn: reader.readUint },
  ]);
};

TypeDecoder.prototype._readSetType = function(reader) {
  return this._readTypeHelper(reader, kind.SET, 'WireSet', [
    {key: 'name', fn: reader.readString },
    {key: 'keyTypeId', fn: reader.readUint },
  ]);
};

TypeDecoder.prototype._readMapType = function(reader) {
  return this._readTypeHelper(reader, kind.MAP, 'WireMap', [
    {key: 'name', fn: reader.readString },
    {key: 'keyTypeId', fn: reader.readUint },
    {key: 'elemTypeId', fn: reader.readUint },
  ]);
};

TypeDecoder.prototype._readStructOrUnionType = function(reader, kind) {
  var fields = [];
  var i = 0;
  var td = this;
  return this._readTypeHelper(reader, kind, 'WireStruct', [
    {key: 'name', fn: reader.readString },
    {key: 'fields', fn: readFields },
  ]).then(function(res) {
    res.fields = res.fields || [];
    return res;
  });

  function readFields() {
    return reader.readUint().then(function(numFields) {
      fields = new Array(numFields);
      return promiseFor(numFields, readField);
    }).then(function() {
      return fields;
    });
  }

  function readField() {
    return td._readTypeHelper(reader, null, 'WireField', [
      {key: 'name', fn: reader.readString },
      {key: 'typeId', fn: reader.readUint },
    ]).then(function(field) {
      fields[i] = field;
      i++;
    });
  }
};

/**
 * Read the binary type description into a partial type description.
 * @param {Uint8Array} messageBytes The binary type message.
 * @return {PartialType} The type that was read.
 */
TypeDecoder.prototype._readPartialType = function(messageBytes) {
  var reader = new RawVomReader(messageBytes);
  var td = this;
  return reader.readUint().then(function(unionId) {
    switch (unionId) {
      case BootstrapTypes.unionIds.NAMED_TYPE:
        return td._readNamedType(reader);
      case BootstrapTypes.unionIds.ENUM_TYPE:
        return td._readEnumType(reader);
      case BootstrapTypes.unionIds.ARRAY_TYPE:
        return td._readArrayType(reader);
      case BootstrapTypes.unionIds.LIST_TYPE:
        return td._readListType(reader);
      case BootstrapTypes.unionIds.SET_TYPE:
        return td._readSetType(reader);
      case BootstrapTypes.unionIds.MAP_TYPE:
        return td._readMapType(reader);
      case BootstrapTypes.unionIds.STRUCT_TYPE:
        return td._readStructOrUnionType(reader, kind.STRUCT);
      case BootstrapTypes.unionIds.UNION_TYPE:
        return td._readStructOrUnionType(reader, kind.UNION);
      case BootstrapTypes.unionIds.OPTIONAL_TYPE:
        return td._readOptionalType(reader);
      default:
        throw new Error('Unknown wire type id ' + unionId);
    }
  });
};
