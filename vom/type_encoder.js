/**
 * @fileoverview Type encoder maintains a mapping of types to type ids and
 * assists in encoding types on the VOM stream.
 */

module.exports = TypeEncoder;

var Kind = require('./kind.js');
var stringify = require('./stringify.js');
var BootstrapTypes = require('./bootstrap_types.js');
var RawVomWriter = require('./raw_vom_writer.js');

/**
 * Create a type encoder to help encode types and associate already sent types
 * to their type ids.
 * @constructor
 */
function TypeEncoder() {
  this._typeIds = {};
  this._nextId = 65;
}

/**
 * Encode a type on the specified message writer.
 * @param {MessageWriter} The message writer.
 * @param {Type} The type to encode.
 * @return {number} The type id of the encoded type.
 */
TypeEncoder.prototype.encodeType = function(messageWriter, type) {
  var id = BootstrapTypes.typeToId(type);
  if (id !== undefined) {
    return id;
  }

  var stringifiedType = stringify(type);
  id = this._typeIds[stringifiedType];
  if (id !== undefined) {
    return id;
  }

  this._validateType(type);
  var typeId = this._nextId++;
  this._typeIds[stringifiedType] = typeId;
  this._encodeWireType(messageWriter, type, typeId);
  return typeId;
};

/**
 * Validate the type. This does not recurse.
 * @param {Type} type The type to check.
 * @throws If the type is invalid.
 */
TypeEncoder.prototype._validateType = function(type) {
  if (!type.hasOwnProperty('kind')) {
    throw new Error('Kind not specified');
  }
  if (typeof type.kind !== 'number') {
    throw new Error('Kind expected to be a number. Got ' + type.kind);
  }

  var requiredFields = ['kind'];
  var optionalFields = [];
  switch (type.kind) {
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
    case Kind.TYPEVAL:
      optionalFields.push('name');
      break;
    case Kind.ENUM:
      requiredFields.push('name');
      requiredFields.push('labels');
      break;
    case Kind.LIST:
      optionalFields.push('name');
      requiredFields.push('elem');
      break;
    case Kind.ARRAY:
      optionalFields.push('name');
      requiredFields.push('len');
      requiredFields.push('elem');
      break;
    case Kind.SET:
      optionalFields.push('name');
      requiredFields.push('key');
      break;
    case Kind.MAP:
      optionalFields.push('name');
      requiredFields.push('key');
      requiredFields.push('elem');
      break;
    case Kind.STRUCT:
      requiredFields.push('name');
      requiredFields.push('fields');
      break;
    case Kind.ONEOF:
      requiredFields.push('name');
      requiredFields.push('types');
      break;
    case Kind.NILABLE:
    case Kind.ANY:
      requiredFields.push('elem');
      break;
    default:
      throw new Error('Unknown kind ' + type.kind);
  }

  // Validate the existance or non-existance of fields.
  var fieldsSeen = {};
  for (var i = 0; i < requiredFields.length; i++) {
    var fieldName = requiredFields[i];
    if (!type.hasOwnProperty(fieldName)) {
      throw new Error('Type ' + type  + ' missing required field \'' +
        fieldName + '\'');
    }
    fieldsSeen[fieldName] = null;
  }
  for (var i = 0; i < optionalFields.length; i++) {
    var fieldName = optionalFields[i];
    if (type.hasOwnProperty(fieldName)) {
      fieldsSeen[fieldName] = null;
    }
  }
  for (var fieldName in type) {
    if (!type.hasOwnProperty(fieldName)) {
      continue;
    }
    if (!fieldsSeen.hasOwnProperty(fieldName)) {
      throw new Error('Unexpected field ' + fieldName + ' in type ' + type);
    }
  }

  // Validate the type of fields.
  if (type.hasOwnProperty('name')) {
    if (typeof type.name !== 'string') {
      throw new Error('name must be a string');
    }
  }

  if (type.hasOwnProperty('labels')) {
    if (!Array.isArray(type.labels)) {
      throw new Error('labels must be an array');
    }
    for (var i = 0; i < type.labels.length; i++) {
      if (typeof type.labels[i] !== 'string') {
        throw new Error('label must be a string');
      }
    }
  }

  if (type.hasOwnProperty('len')) {
    if (typeof type.len !== 'number') {
      throw new Error('len expected to be a number');
    }
  }

  if (type.hasOwnProperty('elem')) {
    if (typeof type.elem !== 'object' || type.elem === null) {
      throw new Error('elem expected to be an object.');
    }
  }

  if (type.hasOwnProperty('key')) {
    if (typeof type.key !== 'object' || type.key === null) {
      throw new Error('key expected to be an object.');
    }
  }

  if (type.hasOwnProperty('fields')) {
    if (!Array.isArray(type.fields)) {
      throw new Error('fields must be an array');
    }
    for (var i = 0; i < type.fields.length; i++) {
      var field = type.fields[i];
      if (typeof field !== 'object' || field  === null) {
        throw new Error('field expected to be an object');
      }
      if (!field.hasOwnProperty('name')) {
        throw new Error('field missing name');
      }
      if (!field.hasOwnProperty('type')) {
        throw new Error('field missing type');
      }
      if (Object.keys(field).length > 2) {
        throw new Error('unexpected field description ' + field);
      }
      if (typeof field.name !== 'string') {
        throw new Error('field name must be of type string');
      }
      if (typeof field.type !== 'object' || field.type === null) {
        throw new Error('field type expected to be an object.');
      }
    }
  }

  if (type.hasOwnProperty('types')) {
    if (!Array.isArray(type.types)) {
      throw new Error('types must be an array');
    }
    for (var i = 0; i < type.types.length; i++) {
      if (typeof type.types[i] !== 'object' || type.types[i] === null) {
        throw new Error('one of type expected to be an object');
      }
    }
  }
};

var kindToBootstrapType = function(kind) {
  switch (kind) {
    case Kind.ANY:
      return BootstrapTypes.definitions.ANY;
    case Kind.BOOL:
      return BootstrapTypes.definitions.BOOL;
    case Kind.BYTE:
      return BootstrapTypes.definitions.BYTE;
    case Kind.UINT16:
      return BootstrapTypes.definitions.UINT16;
    case Kind.UINT32:
      return BootstrapTypes.definitions.UINT32;
    case Kind.UINT64:
      return BootstrapTypes.definitions.UINT64;
    case Kind.INT16:
      return BootstrapTypes.definitions.INT16;
    case Kind.INT32:
      return BootstrapTypes.definitions.INT32;
    case Kind.INT64:
      return BootstrapTypes.definitions.INT64;
    case Kind.FLOAT32:
      return BootstrapTypes.definitions.FLOAT32;
    case Kind.FLOAT64:
      return BootstrapTypes.definitions.FLOAT64;
    case Kind.COMPLEX64:
      return BootstrapTypes.definitions.COMPLEX64;
    case Kind.COMPLEX128:
      return BootstrapTypes.definitions.COMPLEX128;
    case Kind.STRING:
      return BootstrapTypes.definitions.STRING;
    case Kind.TYPEVAL:
      return BootstrapTypes.definitions.TYPEVAL;
    default:
      throw new Error('expected primitive kind ' + kind);
  }
};

/**
 * Write a wiretype description to the message writer.
 * @param {MessageWriter} messageWriter the message writer.
 * @param {Type} type the type of the message.
 * @param {number} typeId the type id for the type.
 */
TypeEncoder.prototype._encodeWireType = function(messageWriter, type, typeId) {
  var rawWriter = new RawVomWriter();
  switch (type.kind) {
    case Kind.ANY:
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
    case Kind.TYPEVAL:
      rawWriter.writeUint(BootstrapTypes.definitions.WIRENAMED.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(kindToBootstrapType(type.kind).id);
      rawWriter.writeUint(0);
      break;
    case Kind.NILABLE:
      // TODO(BPROSNITZ) This format isn't final.
      var elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIRENILABLE.id);
      rawWriter.writeUint(1);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(0);
      break;
    case Kind.ENUM:
      rawWriter.writeUint(BootstrapTypes.definitions.WIREENUM.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(type.labels.length);
      for (var i = 0; i < type.labels.length; i++) {
        rawWriter.writeString(type.labels[i]);
      }
      rawWriter.writeUint(0);
      break;
    case Kind.ARRAY:
      var elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIREARRAY.id);
      if (typeof type.name === 'string') {
        rawWriter.writeUint(1);
        rawWriter.writeString(type.name);
      }
      rawWriter.writeUint(2);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(3);
      rawWriter.writeUint(type.len);
      rawWriter.writeUint(0);
      break;
    case Kind.LIST:
      var elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIRELIST.id);
      if (typeof type.name === 'string') {
        rawWriter.writeUint(1);
        rawWriter.writeString(type.name);
      }
      rawWriter.writeUint(2);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(0);
      break;
    case Kind.SET:
      var keyId = this.encodeType(messageWriter, type.key);
      rawWriter.writeUint(BootstrapTypes.definitions.WIRESET.id);
      if (typeof type.name === 'string') {
        rawWriter.writeUint(1);
        rawWriter.writeString(type.name);
      }
      rawWriter.writeUint(2);
      rawWriter.writeUint(keyId);
      rawWriter.writeUint(0);
      break;
    case Kind.MAP:
      var keyId = this.encodeType(messageWriter, type.key);
      var elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIREMAP.id);
      if (typeof type.name === 'string') {
        rawWriter.writeUint(1);
        rawWriter.writeString(type.name);
      }
      rawWriter.writeUint(2);
      rawWriter.writeUint(keyId);
      rawWriter.writeUint(3);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(0);
      break;
    case Kind.STRUCT:
      var fieldInfo = [];
      for (var i = 0; i < type.fields.length; i++) {
        fieldInfo.push({
          name: type.fields[i].name,
          id: this.encodeType(messageWriter, type.fields[i].type)
        });
      }
      rawWriter.writeUint(BootstrapTypes.definitions.WIRESTRUCT.id);
      if (typeof type.name === 'string') {
        rawWriter.writeUint(1);
        rawWriter.writeString(type.name);
      }
      rawWriter.writeUint(2);
      rawWriter.writeUint(fieldInfo.length);
      for (var i = 0; i < fieldInfo.length; i++) {
        var field = fieldInfo[i];
        rawWriter.writeUint(1);
        rawWriter.writeString(field.name);
        rawWriter.writeUint(2);
        rawWriter.writeUint(field.id);
        rawWriter.writeUint(0);
      }
      rawWriter.writeUint(0);
      break;
    case Kind.ONEOF:
      var typeIds = [];
      for (var i = 0; i < type.types.length; i++) {
        typeIds.push(this.encodeType(messageWriter, type.types[i]));
      }
      rawWriter.writeUint(BootstrapTypes.definitions.WIREONEOF.id);
      if (typeof type.name === 'string') {
        rawWriter.writeUint(1);
        rawWriter.writeString(type.name);
      }
      rawWriter.writeUint(2);
      rawWriter.writeUint(typeIds.length);
      for (var i = 0; i < typeIds.length; i++) {
        rawWriter.writeUint(typeIds[i]);
      }
      rawWriter.writeUint(0);
      break;
    default:
      throw new Error('encodeWireType with unknown kind: ' + type.kind);
  }
  messageWriter.writeTypeMessage(typeId, rawWriter.getBytes());
};