// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a VOM decoder.
 * @private
 */

module.exports = Decoder;

var canonicalize = require('../vdl/canonicalize.js');
var TypeDecoder = require('./type-decoder.js');
var kind = require('../vdl/kind.js');
var Registry = require('../vdl/registry.js');
var types = require('../vdl/types.js');
var util = require('../vdl/util.js');
var unwrap = require('../vdl/type-util').unwrap;
var wiretype = require('../gen-vdl/v.io/v23/vom');
var nativeTypeRegistry = require('../vdl/native-type-registry');

var endByte = unwrap(wiretype.WireCtrlEnd);
var nilByte = unwrap(wiretype.WireCtrlNil);

/**
 * Create a decoder to read objects from the provided message reader.
 * Decode has the option of returning a deeply-wrapped object, or an object only
 * wrapped at the top-level.
 * @param {module:vanadium.vom.ByteArrayMessageReader} reader The message
 * reader.
 * @param {boolean=} deepWrap Whether to deeply wrap. Defaults to false.
 * @memberof module:vanadium.vom
 * @constructor
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
  if (types.JSVALUE.equals(t)) {
    return canonicalize.reduce(value, types.JSVALUE);
  }

  if (nativeTypeRegistry.hasNativeType(t)) {
    return canonicalize.reduce(value, t);
  }
  // If this value should be wrapped, apply the constructor.
  if (t.kind !== kind.TYPEOBJECT && shouldWrap) {
    var Ctor = Registry.lookupOrCreateConstructor(t);
    return new Ctor(value, this._deepWrap);
  }
  return value;
};

Decoder.prototype._decodeUnwrappedValue = function(t, reader) {
  switch (t.kind) {
    case kind.BOOL:
      return reader.readBool();
    case kind.BYTE:
      return reader.readByte();
    case kind.UINT16:
    case kind.UINT32:
      return reader.readUint();
    case kind.UINT64:
      return reader.readBigUint();
    case kind.INT16:
    case kind.INT32:
      return reader.readInt();
    case kind.INT64:
      return reader.readBigInt();
    case kind.FLOAT32:
    case kind.FLOAT64:
      return reader.readFloat();
    case kind.COMPLEX64:
    case kind.COMPLEX128:
      return {
        real: reader.readFloat(),
        imag: reader.readFloat()
      };
    case kind.STRING:
      return reader.readString();
    case kind.ENUM:
      return this._decodeEnum(t, reader);
    case kind.LIST:
      return this._decodeList(t, reader);
    case kind.ARRAY:
      return this._decodeArray(t, reader);
    case kind.SET:
      return this._decodeSet(t, reader);
    case kind.MAP:
      return this._decodeMap(t, reader);
    case kind.STRUCT:
      return this._decodeStruct(t, reader);
    case kind.UNION:
      return this._decodeUnion(t, reader);
    case kind.ANY:
      return this._decodeAny(reader);
    case kind.OPTIONAL:
      return this._decodeOptional(t, reader);
    case kind.TYPEOBJECT:
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
  if (t.elem.kind === kind.BYTE) {
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
    if (ctrl === endByte) {
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
