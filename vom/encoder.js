/**
 * @fileoverview Represents a VOM encoder.
 */

module.exports = Encoder;

var TypeEncoder = require('./type_encoder.js');
var stringify = require('./stringify.js');
var TypeUtil = require('./type_util.js');
var RawVomWriter = require('./raw_vom_writer.js');
var Kind = require('./kind.js');
var Types = require('./types.js');

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
 * @param {} val The value to encode
 * @param {Type} type The type of the value.
 */
Encoder.prototype.encode = function(val, type) {
  if (type === undefined) {
    type = this._guessType(val);
  }
  var typeId = this._typeEncoder.encodeType(this._messageWriter, type);
  var writer = new RawVomWriter();
  this._encodeValue(val, type, writer);
  this._messageWriter.writeValueMessage(typeId,
    TypeUtil.shouldSendLength(type), writer.getBytes());
};

/**
 * Guess the type of a value if there is no type information.
 * @param {} val The value.
 * @return {Type} The type of the value.
 */
Encoder.prototype._guessType = function(val) {
  if (val === undefined || val === null) {
    return Types.ANY;
  }
  if (typeof val === 'number') {
    return Types.FLOAT64;
  }
  if (typeof val === 'boolean') {
    return Types.BOOL;
  }
  if (typeof val === 'string') {
    return Types.STRING;
  }
  if (val.hasOwnProperty('_type')) {
    return val._type;
  }
  // TODO(bprosnitz) Inspect the array elements / object fields and guess based
  // on the contents.
  if (Array.isArray(val)) {
    return {
      kind: Kind.LIST,
      elem: Types.ANY
    };
  }
  return {
    kind: Kind.MAP,
    key: Types.ANY,
    elem: Types.ANY
  };
};

Encoder.prototype._encodeValue = function(v, t, writer) {
  switch (t.kind) {
    case Kind.BOOL:
      writer.writeBool(v);
      break;
    case Kind.BYTE:
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
      if (t.elem.kind === Kind.BYTE) {
        this._encodeBytes(v, t, writer);
        break;
      }
      this._encodeList(v, t, writer);
      break;
    case Kind.ARRAY:
      if (t.elem.kind === Kind.BYTE) {
        this._encodeBytes(v, t, writer);
        break;
      }
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
    case Kind.TYPEVAL:
      var typeId = this._typeEncoder.encodeType(this._messageWriter, v);
      writer.writeUint(typeId);
      break;
    default:
      throw new Error('Unknown kind ' + t.kind);
  }
};

Encoder.prototype._encodeEnum = function(v, t, writer) {
  if (typeof v !== 'string') {
    throw new Error('Invalid non-string value for enum label ' + v);
  }
  var labelIndex = t.labels.indexOf(v);
  if (labelIndex === -1) {
    throw new Error('Label ' + v + ' not found. Possible labels: ' +
      t.labels);
  }
  writer.writeUint(labelIndex);
};

Encoder.prototype._encodeList = function(v, t, writer) {
  if (!Array.isArray(v)) {
    throw new Error('Invalid non-array value for list ' + v);
  }
  writer.writeUint(v.length);
  for (var i = 0; i < v.length; i++) {
    var elem = v[i];
    var elemType = t.elem;
    this._encodeValue(elem, elemType, writer);
  }
};

Encoder.prototype._encodeArray = function(v, t, writer) {
  if (!Array.isArray(v)) {
    throw new Error('Invalid non-array value for array ' + v);
  }
  if (v.length > t.len) {
    throw new Error('Array value exceeds array type bounds.');
  }
  for (var i = 0; i < v.length; i++) {
    var elem = v[i];
    var elemType = t.elem;
    this._encodeValue(elem, elemType, writer);
  }
};

Encoder.prototype._encodeSet = function(v, t, writer) {
  if (typeof v !== 'object') {
    throw new Error('Invalid non-object value for set ' + v);
  }
  var vals = v;
  if (!Array.isArray(v)) {
    if (t.key.kind !== Kind.STRING && t.key.key !== Kind.ANY) {
      throw new Error('Non-string key types not currently allowed.');
    }
    vals = Object.keys(v);
  }
  writer.writeUint(vals.length);
  for (var i = 0; i < vals.length; i++) {
    this._encodeValue(vals[i], t.key, writer);
  }
};

Encoder.prototype._encodeMap = function(v, t, writer) {
  if (typeof v !== 'object' || Array.isArray(v)) {
    throw new Error('Invalid non-object value for set ' + v);
  }
  if (t.key.kind !== Kind.STRING && t.key.kind !== Kind.ANY) {
    throw new Error('Non-string key types not currently allowed.');
  }
  if ('_type' in v) {
      writer.writeUint(Object.keys(v).length - 1);
  } else {
      writer.writeUint(Object.keys(v).length);
  }
  for (var key in v) {
    if (v.hasOwnProperty(key) && key !== '_type') {
      this._encodeValue(key, t.key, writer);
      this._encodeValue(v[key], t.elem, writer);
    }
  }
};

Encoder.prototype._encodeStruct = function(v, t, writer) {
  if (typeof v !== 'object' || Array.isArray(v)) {
    throw new Error('Invalid non-object value for set ' + v);
  }
  for (var key in v) {
    if (!v.hasOwnProperty(key) || key === '_type') {
      continue;
    }
    var val = v[key];

    var fieldIndex = -1;
    for (var i = 0; i < t.fields.length; i++) {
      if (t.fields[i].name === key) {
        fieldIndex = i;
        break;
      }
    }
    if (fieldIndex === -1) {
      throw new Error('Field ' + key + ' not found in type ' + t);
    }
    writer.writeUint(fieldIndex + 1);
    this._encodeValue(val, t.fields[fieldIndex].type, writer);
  }
  writer.writeUint(0);
};

Encoder.prototype._encodeBytes = function(v, t, writer) {
  if (!(v instanceof Uint8Array)) {
    // TODO(bprosnitz) Support more types such as string encodings, etc.
    throw new Error('Can only encode Uint8Array as bytes.');
  }
  writer.writeUint(v.length);
  writer._writeRawBytes(v);
};

Encoder.prototype._encodeNilable = function(v, t, writer) {
  // TODO(bprosnitz) The format of this hasn't been finalized yet.
  if (v === null || v === undefined) {
    writer.writeUint(0);
    return;
  }
  writer.writeUint(1);
  this._encodeValue(v, t.elem, writer);
};

Encoder.prototype._encodeAny = function(v, writer) {
  var t = this._guessType(v);
  var typeId = this._typeEncoder.encodeType(this._messageWriter, t);
  writer.writeUint(typeId);
  this._encodeValue(v, t, writer);
};

/**
 * Guess the corresponding type in the one of for a given value.
 * @param {} val The value.
 * @param {Type[]} types A list of possible types.
 * @return {Type} The guessed type.
 */
Encoder.prototype._guessOneOfType = function(val, types) {
  // TODO(bprosnitz) Centralize these conversion rules and make them consistent
  // with the go implementation.

  if (val.hasOwnProperty('_type')) {
    var valType = val._type;
    var valTypeStr = stringify(valType);
    for (var i = 0; i < types.length; i++) {
      if (stringify(types[i]) === valTypeStr) {
        return valType;
      }
    }
    throw new Error('Invalid type not in OneOf ' + valType);
  }

  if (typeof val === 'number') {
    for (var i = 0; i < types.length; i++) {
      switch (types[i].kind) {
        case Kind.UINT16:
        case Kind.UINT32:
        case Kind.UINT64:
        case Kind.INT16:
        case Kind.INT32:
        case Kind.INT64:
        case Kind.FLOAT32:
        case Kind.FLOAT64:
          return types[i];
      }
    }
    throw new Error('No number type in OneOf');
  }
  if (typeof val === 'boolean') {
    for (var i = 0; i < types.length; i++) {
      if (types[i].kind === Kind.BOOL) {
        return types[i];
      }
    }
    throw new Error('No boolean type in OneOf');
  }
  if (typeof val === 'string') {
    for (var i = 0; i < types.length; i++) {
      if (types[i].kind === Kind.STRING) {
        return types[i];
      }
    }
    throw new Error('No string type in OneOf');
  }

  if (typeof val === 'object') {
    for (var i = 0; i < types.length; i++) {
      var otherType = types[i];
      if (otherType.kind === Kind.ARRAY || otherType.kind === Kind.LIST) {
        if (Array.isArray(val)) {
          return otherType; // TODO(bprosnitz) Make this more closely
        }
      } else if (otherType.kind === Kind.MAP ||
        otherType.kind === Kind.STRUCT) {
        if (!Array.isArray(val)) {
          return otherType;
        }
      } else if (otherType.kind === Kind.SET) {
        return otherType;
      }
    }
    throw new Error('No matching object type in OneOf');
  }

  throw new Error('Unknown type of value ' + (typeof val));
};

Encoder.prototype._encodeOneOf = function(v, t, writer) {
  var concreteType = this._guessOneOfType(v, t.types);
  var typeId = this._typeEncoder.encodeType(this._messageWriter, concreteType);
  writer.writeUint(typeId);
  this._encodeValue(v, concreteType, writer);
};