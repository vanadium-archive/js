/**
 * @fileoverview Represents a VOM encoder.
 */

module.exports = Encoder;

var TypeEncoder = require('./type-encoder.js');
var util = require('./util.js');
var TypeUtil = require('./type-util.js');
var RawVomWriter = require('./raw-vom-writer.js');
var Kind = require('./kind.js');
var canonicalize = require('./canonicalize.js');
var stringify = require('./stringify.js');
var guessType = require('./guess-type.js');
require('./es6-shim');

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
  this._encodeValue(val, type, writer);
  this._messageWriter.writeValueMessage(typeId,
    TypeUtil.shouldSendLength(type), writer.getBytes());
};

Encoder.prototype._encodeValue = function(v, t, writer) {
  v = TypeUtil.unwrap(v);

  switch (t.kind) {
    case Kind.BOOL:
      writer.writeBool(v);
      break;
    case Kind.BYTE:
      writer.writeByte(v);
      break;
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.UINT64:
      writer.writeUint(v);
      break;
    case Kind.INT16:
    case Kind.INT32:
    case Kind.INT64:
      writer.writeInt(v);
      break;
    case Kind.FLOAT32:
    case Kind.FLOAT64:
      writer.writeFloat(v);
      break;
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
      if (typeof v === 'object') {
        writer.writeFloat(v.real);
        writer.writeFloat(v.imag);
      } else if (typeof v === 'number') {
        writer.writeFloat(v);
        writer.writeFloat(0);
      }
      break;
    case Kind.STRING:
      writer.writeString(v);
      break;
    case Kind.ENUM:
      this._encodeEnum(v, t, writer);
      break;
    case Kind.LIST:
      this._encodeList(v, t, writer);
      break;
    case Kind.ARRAY:
      this._encodeArray(v, t, writer);
      break;
    case Kind.SET:
      this._encodeSet(v, t, writer);
      break;
    case Kind.MAP:
      this._encodeMap(v, t, writer);
      break;
    case Kind.STRUCT:
      this._encodeStruct(v, t, writer);
      break;
    case Kind.ONEOF:
      this._encodeOneOf(v, t, writer);
      break;
    case Kind.ANY:
      this._encodeAny(v, writer);
      break;
    case Kind.NILABLE:
      this._encodeNilable(v, t, writer);
      break;
    case Kind.TYPEOBJECT:
      var typeId = this._typeEncoder.encodeType(this._messageWriter, v);
      writer.writeUint(typeId);
      break;
    default:
      throw new Error('Unknown kind ' + t.kind);
  }
};

Encoder.prototype._encodeEnum = function(v, t, writer) {
  var labelIndex = t.labels.indexOf(v);
  writer.writeUint(labelIndex);
};

Encoder.prototype._encodeList = function(v, t, writer) {
  writer.writeUint(v.length);
  this._writeSequence(v, t, writer);
};

Encoder.prototype._encodeArray = function(v, t, writer) {
  this._writeSequence(v, t, writer);
};

Encoder.prototype._encodeSet = function(v, t, writer) {
  writer.writeUint(v.size);
  v.forEach(function(value, key) {
    this._encodeValue(key, t.key, writer);
  }, this);
};

Encoder.prototype._encodeMap = function(v, t, writer) {
  writer.writeUint(v.size);
  v.forEach(function(value, key) {
    this._encodeValue(key, t.key, writer);
    this._encodeValue(value, t.elem, writer);
  }, this);
};

Encoder.prototype._encodeStruct = function(v, t, writer) {
  // Encode the fields.
  t.fields.forEach(function(fieldDesc, fieldIndex) {
    writer.writeUint(fieldIndex + 1);
    var fieldVal = v[util.uncapitalize(fieldDesc.name)];
    this._encodeValue(fieldVal, fieldDesc.type, writer);
  }, this);
  writer.writeUint(0);
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

Encoder.prototype._encodeNilable = function(v, t, writer) {
  if (v === null || v === undefined) {
    writer.writeUint(0);
    return;
  }
  writer.writeUint(1);
  this._encodeValue(v, t.elem, writer);
};

Encoder.prototype._encodeAny = function(v, writer) {
  if (v === null || v === undefined) {
    writer.writeUint(0);
    return;
  }
  var t = guessType(v);
  var typeId = this._typeEncoder.encodeType(this._messageWriter, t);
  writer.writeUint(typeId);
  this._encodeValue(v, t, writer);
};

Encoder.prototype._encodeOneOf = function(v, t, writer) {
  for (var i = 0; i < t.fields.length; i++) {
    var key = t.fields[i].name;
    var lowerKey = util.uncapitalize(key);
    if (v.hasOwnProperty(lowerKey) && v[lowerKey] !== undefined) {
      writer.writeUint(i + 1); // Encoded index is 1-index.
      this._encodeValue(v[lowerKey], t.fields[i].type, writer);
      return; // Stop after writing a single field.
    }
  }
  throw new Error('OneOf did not encode properly. Received: ' + stringify(v));
};
