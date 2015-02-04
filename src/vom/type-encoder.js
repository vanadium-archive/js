/**
 * @fileoverview Type encoder maintains a mapping of types to type ids and
 * assists in encoding types on the VOM stream.
 */

module.exports = TypeEncoder;

var Kind = require('./kind.js');
var stringify = require('./stringify.js');
var canonicalize = require('./canonicalize.js');
var util = require('./util.js');
var BootstrapTypes = require('./bootstrap-types.js');
var RawVomWriter = require('./raw-vom-writer.js');

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
  if (typeof type !== 'object') {
    throw new Error('Type must be an object, but instead had value ' + type);
  }

  var id = BootstrapTypes.typeToId(type);
  if (id !== undefined) {
    return id;
  }

  // This isn't a bootstrap type, so it needs to be canonicalized.
  type = canonicalize.type(type);

  // Check the cache of types that have been encoded already.
  var stringifiedType = stringify(type);
  id = this._typeIds[stringifiedType];
  if (id !== undefined) {
    return id;
  }

  // This type wasn't in the cache. Update it, and encode the type.
  var typeId = this._nextId++;
  this._typeIds[stringifiedType] = typeId;
  this._encodeWireType(messageWriter, type, typeId);
  return typeId;
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
    case Kind.TYPEOBJECT:
      return BootstrapTypes.definitions.TYPEOBJECT;
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
  var i;
  var elemId;
  var keyId;
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
    case Kind.TYPEOBJECT:
      rawWriter.writeUint(BootstrapTypes.definitions.WIRENAMED.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(kindToBootstrapType(type.kind).id);
      rawWriter.writeUint(0);
      break;
    case Kind.OPTIONAL:
      elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIREOPTIONAL.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(0);
      break;
    case Kind.ENUM:
      rawWriter.writeUint(BootstrapTypes.definitions.WIREENUM.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(type.labels.length);
      for (i = 0; i < type.labels.length; i++) {
        rawWriter.writeString(type.labels[i]);
      }
      rawWriter.writeUint(0);
      break;
    case Kind.ARRAY:
      elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIREARRAY.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(3);
      rawWriter.writeUint(type.len);
      rawWriter.writeUint(0);
      break;
    case Kind.LIST:
      elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIRELIST.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(0);
      break;
    case Kind.SET:
      keyId = this.encodeType(messageWriter, type.key);
      rawWriter.writeUint(BootstrapTypes.definitions.WIRESET.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(keyId);
      rawWriter.writeUint(0);
      break;
    case Kind.MAP:
      keyId = this.encodeType(messageWriter, type.key);
      elemId = this.encodeType(messageWriter, type.elem);
      rawWriter.writeUint(BootstrapTypes.definitions.WIREMAP.id);
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(keyId);
      rawWriter.writeUint(3);
      rawWriter.writeUint(elemId);
      rawWriter.writeUint(0);
      break;
    case Kind.STRUCT:
    case Kind.UNION:
      var fieldInfo = [];
      for (i = 0; i < type.fields.length; i++) {
        fieldInfo.push({
          name: util.capitalize(type.fields[i].name),
          id: this.encodeType(messageWriter, type.fields[i].type)
        });
      }
      if (type.kind === Kind.STRUCT) {
        rawWriter.writeUint(BootstrapTypes.definitions.WIRESTRUCT.id);
      } else {
        rawWriter.writeUint(BootstrapTypes.definitions.WIREUNION.id);
      }
      rawWriter.writeUint(1);
      rawWriter.writeString(type.name);
      rawWriter.writeUint(2);
      rawWriter.writeUint(fieldInfo.length);
      for (i = 0; i < fieldInfo.length; i++) {
        var field = fieldInfo[i];
        rawWriter.writeUint(1);
        rawWriter.writeString(field.name);
        rawWriter.writeUint(2);
        rawWriter.writeUint(field.id);
        rawWriter.writeUint(0);
      }
      rawWriter.writeUint(0);
      break;
    default:
      throw new Error('encodeWireType with unknown kind: ' + type.kind);
  }
  messageWriter.writeTypeMessage(typeId, rawWriter.getBytes());
};
