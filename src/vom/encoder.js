// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Represents a VOM encoder.
 * @private
 */

module.exports = Encoder;

var TypeEncoder = require('./type-encoder.js');
var util = require('../vdl/util.js');
var typeUtil = require('../vdl/type-util.js');
var RawVomWriter = require('./raw-vom-writer.js');
var kind = require('../vdl/kind.js');
var canonicalize = require('../vdl/canonicalize.js');
var stringify = require('../vdl/stringify.js');
var guessType = require('../vdl/guess-type.js');
var BigInt = require('../vdl/big-int');
var BootstrapTypes = require('./bootstrap-types');

var unwrap = require('../vdl/type-util').unwrap;
var wiretype = require('../gen-vdl/v.io/v23/vom');

var endByte = unwrap(wiretype.WireCtrlEnd);
var nilByte = unwrap(wiretype.WireCtrlNil);

var versions = require('./versions.js');

require('../vdl/es6-shim');

/**
 * Create an encoder that manages the transmission and marshaling of typed
 * values to the other side of a connection.
 * @param {module:vanadium.vom.ByteMessageWriter} messageWriter The
 * message writer to write to.
 * @param {module:vanadim.vom.TypeEncoder} typeEncoder If set, the passed
 * in type encoder will be used and the type messages will not appear in
 * messageWriter's output.
 * @param {number} version vom version (e.g. 0x80, 0x81, ...)
 * @constructor
 * @memberof module:vanadium.vom
 */
function Encoder(messageWriter, typeEncoder, version) {
  this._messageWriter = messageWriter;
  if (typeEncoder) {
    this._typeEncoder = typeEncoder;
  } else {
    this._typeEncoder = new TypeEncoder(messageWriter);
  }
  if (!version) {
    version = versions.defaultVersion;
  }
  this._version = version;
}

/**
 * Encodes a value.
 * @param {*} val The value to encode
 * @param {module:vanadium.vdl.Type} type The type of the value.
 */
Encoder.prototype.encode = function(val, type) {
  if (type === undefined) {
    type = guessType(val);
  }

  // Canonicalize and validate the value. This prepares the value for encoding.
  val = canonicalize.fill(val, type);

  var typeId = this._typeEncoder.encodeType(type);
  this._typeIds = [];
  this._anyLens = [];
  var writer = new RawVomWriter(this._version);
  this._encodeValue(val, type, writer, false);
  this._messageWriter.writeValueMessage(typeId,
    typeUtil.shouldSendLength(type), typeUtil.hasAny(type),
    typeUtil.hasTypeObject(type), this._typeIds, this._anyLens,
    writer.getBytes());
};

Encoder.prototype._encodeValue = function(v, t, writer, omitEmpty) {
  v = typeUtil.unwrap(v);

  switch (t.kind) {
    case kind.BOOL:
      if (!v && omitEmpty) {
        return false;
      }
      writer.writeBool(v);
      return true;
    case kind.BYTE:
      if (!v && omitEmpty) {
        return false;
      }
      writer.writeByte(v);
      return true;
    case kind.UINT16:
    case kind.UINT32:
    case kind.UINT64:
      if (!v && omitEmpty) {
        return false;
      }
      if ((v instanceof BigInt) && omitEmpty && v._sign === 0) {
        return false;
      }
      writer.writeUint(v);
      return true;
    case kind.INT8:
      if (this._version === versions.version80) {
        throw new Error('int8 is not supported in VOM version 0x80');
      } // jshint ignore:line
    case kind.INT16:
    case kind.INT32:
    case kind.INT64:
      if (!v && omitEmpty) {
        return false;
      }
      if ((v instanceof BigInt) && omitEmpty && v._sign === 0) {
        return false;
      }
      writer.writeInt(v);
      return true;
    case kind.FLOAT32:
    case kind.FLOAT64:
      if (!v && omitEmpty) {
        return false;
      }
      writer.writeFloat(v);
      return true;
    case kind.COMPLEX64:
    case kind.COMPLEX128:
      if (typeof v === 'object') {
        if (v.real === 0 && v.imag === 0 && omitEmpty) {
          return false;
        }
        writer.writeFloat(v.real);
        writer.writeFloat(v.imag);
        return true;
      } else if (typeof v === 'number' && omitEmpty) {
        if (v === 0) {
          return false;
        }
        writer.writeFloat(v);
        writer.writeFloat(0);
        return true;
      }
      return false;
    case kind.STRING:
      if (v === '' && omitEmpty) {
        return false;
      }
      writer.writeString(v);
      return true;
    case kind.ENUM:
      return this._encodeEnum(v, t, writer, omitEmpty);
    case kind.LIST:
      return this._encodeList(v, t, writer, omitEmpty);
    case kind.ARRAY:
      return this._encodeArray(v, t, writer, omitEmpty);
    case kind.SET:
      return this._encodeSet(v, t, writer, omitEmpty);
    case kind.MAP:
      return this._encodeMap(v, t, writer, omitEmpty);
    case kind.STRUCT:
      return this._encodeStruct(v, t, writer, omitEmpty);
    case kind.UNION:
      return this._encodeUnion(v, t, writer, omitEmpty);
    case kind.ANY:
      return this._encodeAny(v, writer, omitEmpty);
    case kind.OPTIONAL:
      return this._encodeOptional(v, t, writer, omitEmpty);
    case kind.TYPEOBJECT:
      var typeId = this._typeEncoder.encodeType(v);
      if (typeId === BootstrapTypes.definitions.ANY.id && omitEmpty) {
        return false;
      }
      if (this._version === versions.version80) {
        writer.writeUint(typeId);
      } else {
        writer.writeUint(this._addTypeId(typeId));
      }
      return true;
    default:
      throw new Error('Unknown kind ' + t.kind);
  }
};

Encoder.prototype._encodeEnum = function(v, t, writer, omitEmpty) {
  var labelIndex = t.labels.indexOf(v);
  if (omitEmpty && labelIndex === 0) {
    return false;
  }
  writer.writeUint(labelIndex);
  return true;
};

Encoder.prototype._encodeList = function(v, t, writer, omitEmpty) {
  if (v.length === 0 && omitEmpty) {
    return false;
  }
  writer.writeUint(v.length);
  this._writeSequence(v, t, writer);
  return true;
};

Encoder.prototype._encodeArray = function(v, t, writer) {
  writer.writeUint(0);
  this._writeSequence(v, t, writer);
  return true;
};

Encoder.prototype._encodeSet = function(v, t, writer, omitEmpty) {
  if (v.size === 0 && omitEmpty) {
    return false;
  }
  writer.writeUint(v.size);
  v.forEach(function(value, key) {
    this._encodeValue(key, t.key, writer);
  }, this);
  return true;
};

Encoder.prototype._encodeMap = function(v, t, writer, omitEmpty) {
  if (v.size === 0 && omitEmpty) {
    return false;
  }
  writer.writeUint(v.size);
  v.forEach(function(value, key) {
    this._encodeValue(key, t.key, writer);
    this._encodeValue(value, t.elem, writer);
  }, this);
  return true;
};

Encoder.prototype._encodeStruct = function(v, t, writer, omitEmpty) {
  // Encode the fields.
  var hasWrittenFields = false;
  t.fields.forEach(function(fieldDesc, fieldIndex) {
    var pos = writer.getPos();
    writer.writeUint(fieldIndex);
    var fieldVal = v[util.uncapitalize(fieldDesc.name)];
    var valueWritten = this._encodeValue(fieldVal, fieldDesc.type, writer,
                                         true);
    if (!valueWritten) {
      writer.seekBack(pos);
    } else {
      hasWrittenFields = true;
    }
  }, this);
  if (omitEmpty && !hasWrittenFields) {
    return false;
  }
  writer.writeControlByte(endByte);
  return true;
};

Encoder.prototype._writeSequence = function(v, t, writer) {
  if (t.elem.kind === kind.BYTE) {
    // Byte sequences can be copied directly from the input Uint8Array.
    writer._writeRawBytes(v);
    return;
  }

  for (var i = 0; i < v.length; i++) {
    var elem = v[i];
    var elemType = t.elem;
    this._encodeValue(elem, elemType, writer);
  }
};

Encoder.prototype._encodeOptional = function(v, t, writer, omitEmpty) {
  if (v === null || v === undefined) {
    if (omitEmpty) {
      return false;
    }
    writer.writeControlByte(nilByte);
    return true;
  }
  this._encodeValue(v, t.elem, writer, false);
  return true;
};

Encoder.prototype._encodeAny = function(v, writer, omitEmpty) {
  if (v === null || v === undefined) {
    if (omitEmpty) {
      return false;
    }
    writer.writeControlByte(nilByte);
    return true;
  }
  var t = guessType(v);
  var typeId = this._typeEncoder.encodeType(t);
  var anyLenIndex;
  var startPos;
  if (this._version === versions.version80) {
    writer.writeUint(typeId);
  } else {
    writer.writeUint(this._addTypeId(typeId));
    anyLenIndex = this._nextAnyLenIndex();
    writer.writeUint(anyLenIndex);
    startPos = writer.getPos();
  }
  this._encodeValue(v, t, writer, false);
  if (this._version !== versions.version80) {
    var endPos = writer.getPos();
    this._anyLens[anyLenIndex] = endPos - startPos;
  }
  return true;
};

Encoder.prototype._encodeUnion = function(v, t, writer, omitEmpty) {
  for (var i = 0; i < t.fields.length; i++) {
    var key = t.fields[i].name;
    var lowerKey = util.uncapitalize(key);
    if (v.hasOwnProperty(lowerKey) && v[lowerKey] !== undefined) {
      var pos = writer.getPos();
      writer.writeUint(i);
      // We can only omit empty values if it is the first field in the
      // union.  If it is the second or later field, it always has to
      // be emitted.
      omitEmpty = omitEmpty && i === 0;
      var encoded = this._encodeValue(v[lowerKey], t.fields[i].type, writer,
                                      omitEmpty);

      if (!encoded) {
        writer.seekBack(pos);
        return false;
      }
      return true;
    }
  }
  throw new Error('Union did not encode properly. Received: ' + stringify(v));
};

Encoder.prototype._addTypeId = function(typeId) {
  var index = this._typeIds.indexOf(typeId);
  if (index !== -1) {
    return index;
  }
  index = this._typeIds.length;
  this._typeIds.push(typeId);
  return index;
};

Encoder.prototype._nextAnyLenIndex = function() {
  var index = this._anyLens.length;
  this._anyLens.push(0);
  return index;
};
