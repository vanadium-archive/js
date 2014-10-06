/**
 * @fileoverview Represents a VOM decoder.
 */

module.exports = Decoder;

 var TypeDecoder = require('./type_decoder.js');
 var Kind = require('./kind.js');
 var stringify = require('./stringify.js');

/**
 * Create a decoder to read objects from the provided message reader.
 * @param {MessageReader} The message reader.
 * @constructor
 */
function Decoder(messageReader) {
  this._messageReader = messageReader;
  this._typeDecoder = new TypeDecoder();
}

/**
 * Decodes the next object off of the message reader.
 * TODO(bprosnitz) We will want to be able to decode when we get callbacks.
 * Revisit this API.
 * @return The next object or null if no more objects are available.
 */
Decoder.prototype.decode = function() {
  var type = this._messageReader.nextMessageType(this._typeDecoder);
  if (type === null) {
    return null;
  }
  var reader = this._messageReader.rawReader;
  return this._decodeValue(type, reader);
};

Decoder.prototype._decodeValue = function(t, reader) {
  switch (t.kind) {
    case Kind.BOOL:
      return reader.readBool();
    case Kind.BYTE:
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.UINT64:
      return reader.readUint();
    case Kind.INT16:
    case Kind.INT32:
    case Kind.INT64:
      return reader.readInt();
    case Kind.FLOAT32:
    case Kind.FLOAT64:
      return reader.readFloat();
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
      return {
        real: reader.readFloat(),
        imag: reader.readFloat()
      };
    case Kind.STRING:
      return reader.readString();
    case Kind.ENUM:
      return this._decodeEnum(t, reader);
    case Kind.LIST:
      if (t.elem.kind === Kind.BYTE) {
        return this._decodeBytes(t, reader);
      }
      return this._decodeList(t, reader);
    case Kind.ARRAY:
      if (t.elem.kind === Kind.BYTE) {
        return this._decodeBytes(t, reader);
      }
      return this._decodeArray(t, reader);
    case Kind.SET:
      return this._decodeSet(t, reader);
    case Kind.MAP:
      return this._decodeMap(t, reader);
    case Kind.STRUCT:
      return this._decodeStruct(t, reader);
    case Kind.ONEOF:
      return this._decodeOneOf(t, reader);
    case Kind.ANY:
      return this._decodeAny(reader);
    case Kind.NILABLE:
      return this._decodeNilable(t, reader);
    case Kind.TYPEVAL:
      var typeId = reader.readUint();
      var type = this._typeDecoder.lookupType(typeId);
      if (type === undefined) {
        throw new Error('Undefined type for typeval id ' + typeId);
      }
      return type;
    default:
      throw new Error('Support for decoding kind ' + t.kind +
        ' not yet implemented');
  }
};

Decoder.prototype._decodeEnum = function(t, reader) {
  var index = reader.readUint();
  if (t.labels.length <= index) {
    throw new Error('Invalid enum index ' + index);
  }
  return t.labels[index];
};

Decoder.prototype._decodeList = function(t, reader) {
  var len = reader.readUint();
  var arr = new Array(len);
  for (var i = 0; i < len; i++) {
    arr[i] = this._decodeValue(t.elem, reader);
  }
  return arr;
};

Decoder.prototype._decodeArray = function(t, reader) {
  var arr = new Array(t.len);
  for (var i = 0; i < t.len; i++) {
    arr[i] = this._decodeValue(t.elem, reader);
  }
  Object.preventExtensions(arr);
  return arr;
};

Decoder.prototype._decodeSet = function(t, reader) {
  if (t.key.kind !== Kind.STRING && t.key.kind !== Kind.ANY) {
    throw new Error('Non-string key types not currently allowed.');
  }
  var len = reader.readUint();
  var obj = {};
  for (var i = 0; i < len; i++) {
    var key = this._decodeValue(t.key, reader);
    obj[key] = null;
  }
  return obj;
};

Decoder.prototype._decodeMap = function(t, reader) {
  if (t.key.kind !== Kind.STRING && t.key.kind !== Kind.ANY) {
    throw new Error('Non-string key types not currently allowed.');
  }
  var len = reader.readUint();
  var obj = {};
  for (var i = 0; i < len; i++) {
    var key = this._decodeValue(t.key, reader);
    var val = this._decodeValue(t.elem, reader);
    obj[key] = val;
  }
  return obj;
};

Decoder.prototype._decodeStruct = function(t, reader) {
  var obj = {};
  while (true) {
    var nextIndex = reader.readUint() - 1;
    if (nextIndex === -1) {
      break;
    }
    if (t.fields.length <= nextIndex) {
      throw new Error('Struct index ' + nextIndex + ' out of bounds');
    }
    var field = t.fields[nextIndex];
    var val = this._decodeValue(field.type, reader);
    obj[field.name] = val;
  }
  return obj;
};

Decoder.prototype._decodeBytes = function(t, reader) {
  var len = reader.readUint();
  return reader._readRawBytes(len);
};

Decoder.prototype._decodeNilable = function(t, reader) {
  var isNil = reader.readUint();
  if (isNil === 0) {
    return null;
  }
  return this._decodeValue(t.elem, reader);
};

Decoder.prototype._decodeAny = function(reader) {
  var typeId = reader.readUint();
  var type = this._typeDecoder.lookupType(typeId);
  if (type === undefined) {
    throw new Error('Undefined typeid ' + typeId);
  }
  var result = this._decodeValue(type, reader);
  if (typeof result === 'object' && !Array.isArray(result) && result !== null) {
    result._type = type;
  }
  return result;
};

Decoder.prototype._decodeOneOf = function(t, reader) {
  var typeId = reader.readUint();
  var type = this._typeDecoder.lookupType(typeId);
  if (type === undefined) {
    throw new Error('Undefined typeid ' + typeId);
  }

  // Check that the value we received is from a valid one of type.
  var types = t.types;
  var typeStr = stringify(type);
  var found = false;
  for (var i = 0; i < types.length; i++) {
    if (typeStr === stringify(types[i])) {
      found = true;
      break;
    }
  }
  if (!found) {
    throw new Error('Received type not in one of ' + type);
  }

  var result = this._decodeValue(type, reader);
  if (typeof result === 'object' && !Array.isArray(result) && result !== null) {
    result._type = type;
  }
  return result;
};