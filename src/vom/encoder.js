/**
 * @fileoverview Represents a VOM encoder.
 */

module.exports = Encoder;

var TypeEncoder = require('./type-encoder.js');
var util = require('../vdl/util.js');
var TypeUtil = require('../vdl/type-util.js');
var RawVomWriter = require('./raw-vom-writer.js');
var Kind = require('../vdl/kind.js');
var canonicalize = require('../vdl/canonicalize.js');
var stringify = require('../vdl/stringify.js');
var guessType = require('../vdl/guess-type.js');
var BigInt = require('../vdl/big-int');
var BootstrapTypes = require('./bootstrap-types');

var unwrap = require('../vdl/type-util').unwrap;
var wiretype = require('../v.io/core/veyron2/vom');

var eofByte = unwrap(wiretype.WireCtrlEOF);
var nilByte = unwrap(wiretype.WireCtrlNil);

require('../vdl/es6-shim');

/**
 * Create an encoder that writes to the specified message writer.
 * @param {MessageWriter} messageWriter The message writer to write to.
 * @constructor
 */
function Encoder(messageWriter) {
  this._messageWriter = messageWriter;
  this._typeEncoder = new TypeEncoder();
}

/**
 * Encodes a value.
 * @param {any} val The value to encode
 * @param {Type} type The type of the value.
 */
Encoder.prototype.encode = function(val, type) {
  if (type === undefined) {
    type = guessType(val);
  }

  // Canonicalize and validate the value. This prepares the value for encoding.
  val = canonicalize.fill(val, type);

  var typeId = this._typeEncoder.encodeType(this._messageWriter, type);
  var writer = new RawVomWriter();
  this._encodeValue(val, type, writer, false);
  this._messageWriter.writeValueMessage(typeId,
    TypeUtil.shouldSendLength(type), writer.getBytes());
};

Encoder.prototype._encodeValue = function(v, t, writer, omitEmpty) {
  v = TypeUtil.unwrap(v);

  switch (t.kind) {
    case Kind.BOOL:
      if (!v && omitEmpty) {
        return false;
      }
      writer.writeBool(v);
      return true;
    case Kind.BYTE:
      if (!v && omitEmpty) {
        return false;
      }
      writer.writeByte(v);
      return true;
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.UINT64:
      if (!v && omitEmpty) {
        return false;
      }
      if ((v instanceof BigInt) && omitEmpty && v._sign === 0) {
        return false;
      }
      writer.writeUint(v);
      return true;
    case Kind.INT16:
    case Kind.INT32:
    case Kind.INT64:
      if (!v && omitEmpty) {
        return false;
      }
      if ((v instanceof BigInt) && omitEmpty && v._sign === 0) {
        return false;
      }
      writer.writeInt(v);
      return true;
    case Kind.FLOAT32:
    case Kind.FLOAT64:
      if (!v && omitEmpty) {
        return false;
      }
      writer.writeFloat(v);
      return true;
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
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
    case Kind.STRING:
      if (v === '' && omitEmpty) {
        return false;
      }
      writer.writeString(v);
      return true;
    case Kind.ENUM:
      return this._encodeEnum(v, t, writer, omitEmpty);
    case Kind.LIST:
      return this._encodeList(v, t, writer, omitEmpty);
    case Kind.ARRAY:
      return this._encodeArray(v, t, writer, omitEmpty);
    case Kind.SET:
      return this._encodeSet(v, t, writer, omitEmpty);
    case Kind.MAP:
      return this._encodeMap(v, t, writer, omitEmpty);
    case Kind.STRUCT:
      return this._encodeStruct(v, t, writer, omitEmpty);
    case Kind.UNION:
      return this._encodeUnion(v, t, writer, omitEmpty);
    case Kind.ANY:
      return this._encodeAny(v, writer, omitEmpty);
    case Kind.OPTIONAL:
      return this._encodeOptional(v, t, writer, omitEmpty);
    case Kind.TYPEOBJECT:
      var typeId = this._typeEncoder.encodeType(this._messageWriter, v);
      if (typeId === BootstrapTypes.definitions.ANY.id && omitEmpty) {
        return false;
      }
      writer.writeUint(typeId);
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
  writer.writeByte(eofByte);
  return true;
};

Encoder.prototype._writeSequence = function(v, t, writer) {
  if (t.elem.kind === Kind.BYTE) {
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
    writer.writeByte(nilByte);
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
    writer.writeByte(nilByte);
    return true;
  }
  var t = guessType(v);
  var typeId = this._typeEncoder.encodeType(this._messageWriter, t);
  writer.writeUint(typeId);
  this._encodeValue(v, t, writer, false);
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
