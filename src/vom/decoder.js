/**
 * @fileoverview Represents a VOM decoder.
 */

module.exports = Decoder;

var canonicalize = require('../vdl/canonicalize.js');
var TypeDecoder = require('./type-decoder.js');
var Kind = require('../vdl/kind.js');
var Registry = require('../vdl/registry.js');
var Types = require('../vdl/types.js');
var util = require('../vdl/util.js');
var unwrap = require('../vdl/type-util').unwrap;
var wiretype = require('../v.io/core/veyron2/vom');

var eofByte = unwrap(wiretype.WireCtrlEOF);
var nilByte = unwrap(wiretype.WireCtrlNil);

/**
 * Create a decoder to read objects from the provided message reader.
 * Decode has the option of returning a deeply-wrapped object, or an object only
 * wrapped at the top-level.
 *
 * @param {MessageReader} The message reader.
 * @param {boolean=} deepWrap Whether to deeply wrap. Defaults to false.
 */
function Decoder(messageReader, deepWrap) {
  this._messageReader = messageReader;
  this._typeDecoder = new TypeDecoder();
  this._deepWrap = deepWrap || false;
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
  return this._decodeValue(type, reader, true);
};

Decoder.prototype._decodeValue = function(t, reader, shouldWrap) {
  var value = this._decodeUnwrappedValue(t, reader);

  // Special: JSValue should be reduced and returned as a native value.
  if (Types.JSVALUE.equals(t)) {
    return canonicalize.reduce(value, Types.JSVALUE);
  }

  // If this value should be wrapped, apply the constructor.
  if (t.kind !== Kind.TYPEOBJECT && shouldWrap) {
    var Ctor = Registry.lookupOrCreateConstructor(t);
    return new Ctor(value, this._deepWrap);
  }
  return value;
};

Decoder.prototype._decodeUnwrappedValue = function(t, reader) {
  switch (t.kind) {
    case Kind.BOOL:
      return reader.readBool();
    case Kind.BYTE:
      return reader.readByte();
    case Kind.UINT16:
    case Kind.UINT32:
      return reader.readUint();
    case Kind.UINT64:
      return reader.readBigUint();
    case Kind.INT16:
    case Kind.INT32:
      return reader.readInt();
    case Kind.INT64:
      return reader.readBigInt();
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
      return this._decodeList(t, reader);
    case Kind.ARRAY:
      return this._decodeArray(t, reader);
    case Kind.SET:
      return this._decodeSet(t, reader);
    case Kind.MAP:
      return this._decodeMap(t, reader);
    case Kind.STRUCT:
      return this._decodeStruct(t, reader);
    case Kind.UNION:
      return this._decodeUnion(t, reader);
    case Kind.ANY:
      return this._decodeAny(reader);
    case Kind.OPTIONAL:
      return this._decodeOptional(t, reader);
    case Kind.TYPEOBJECT:
      var typeId = reader.readUint();
      var type = this._typeDecoder.lookupType(typeId);
      if (type === undefined) {
        throw new Error('Undefined type for TYPEOBJECT id ' + typeId);
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
  return this._readSequence(t, len, reader);
};

Decoder.prototype._decodeArray = function(t, reader) {
  // Consume the zero byte at the beginning of the array.
  var b = reader.readByte();
  if (b !== 0) {
    throw new Error('Unexpected length ' + b);
  }
  return this._readSequence(t, t.len, reader);
};

Decoder.prototype._readSequence = function(t, len, reader) {
  if (t.elem.kind === Kind.BYTE) {
    // Read byte sequences directly into Uint8Arrays.

    // The Uint8Array is created by calling subarray. In node, this means that
    // its buffer points to the whole binary_reader buffer. To fix this, we
    // recreate the Uint8Array here to avoid exposing it.
    return new Uint8Array(reader._readRawBytes(len));
  }

  var arr = new Array(len);
  for (var i = 0; i < len; i++) {
    arr[i] = this._decodeValue(t.elem, reader, false);
  }
  return arr;
};

Decoder.prototype._decodeSet = function(t, reader) {
  var len = reader.readUint();
  var s = new Set();
  for (var i = 0; i < len; i++) {
    var key = this._decodeValue(t.key, reader, false);
    s.add(key);
  }
  return s;
};

Decoder.prototype._decodeMap = function(t, reader) {
  var len = reader.readUint();
  var m = new Map();
  for (var i = 0; i < len; i++) {
    var key = this._decodeValue(t.key, reader, false);
    var val = this._decodeValue(t.elem, reader, false);
    m.set(key, val);
  }
  return m;
};

Decoder.prototype._decodeStruct = function(t, reader) {
  var Ctor = Registry.lookupOrCreateConstructor(t);
  var obj = Object.create(Ctor.prototype);
  while (true) {
    var ctrl = reader.tryReadControlByte();
    if (ctrl === eofByte) {
      break;
    }

    if (ctrl) {
      throw new Error('Unexpected control byte ' + ctrl);
    }

    var nextIndex = reader.readUint();
    if (t.fields.length <= nextIndex) {
      throw new Error('Struct index ' + nextIndex + ' out of bounds');
    }
    var field = t.fields[nextIndex];
    var val = this._decodeValue(field.type, reader, false);
    obj[util.uncapitalize(field.name)] = val;
  }
  return obj;
};

Decoder.prototype._decodeOptional = function(t, reader) {
  var isNil = reader.peekByte();
  if (isNil === nilByte) {
    reader.readByte();
    return null;
  }
  return this._decodeValue(t.elem, reader, false);
};

Decoder.prototype._decodeAny = function(reader) {
  var ctrl = reader.tryReadControlByte();
  if (ctrl === nilByte) {
    return null;
  }

  if (ctrl) {
    throw new Error('Unexpected control byte ' + ctrl);
  }
  var typeId = reader.readUint();
  var type = this._typeDecoder.lookupType(typeId);
  if (type === undefined) {
    throw new Error('Undefined typeid ' + typeId);
  }
  return this._decodeValue(type, reader, true);
};

Decoder.prototype._decodeUnion = function(t, reader) {
  // Find the Union field that was set and decode its value.
  var fieldIndex = reader.readUint();
  if (t.fields.length <= fieldIndex) {
    throw new Error('Union index ' + fieldIndex + ' out of bounds');
  }
  var field = t.fields[fieldIndex];
  var val = this._decodeValue(field.type, reader, false);

  // Return the Union with a single field set to its decoded value.
  var Ctor = Registry.lookupOrCreateConstructor(t);
  var obj = Object.create(Ctor.prototype);
  obj[util.uncapitalize(field.name)] = val;
  return obj;
};
