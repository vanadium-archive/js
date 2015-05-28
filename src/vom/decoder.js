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
var Deferred = require('../lib/deferred');
var Promise = require('../lib/promise');
var TaskSequence = require('../lib/task-sequence');
var promiseFor = require('../lib/async-helper').promiseFor;
var promiseWhile = require('../lib/async-helper').promiseWhile;

var endByte = unwrap(wiretype.WireCtrlEnd);
var nilByte = unwrap(wiretype.WireCtrlNil);

/**
 * Create a decoder to read objects from the provided message reader.
 * Decode has the option of returning a deeply-wrapped object, or an object only
 * wrapped at the top-level.
 * @param {module:vanadium.vom.ByteArrayMessageReader} reader The message
 * reader.
 * @param {boolean=} deepWrap Whether to deeply wrap. Defaults to false.
 * @param {module:vanadium.vom.TypeDecoder} typeDecoder The type decoder to
 * use.  This can be null.
 * @memberof module:vanadium.vom
 * @constructor
 */
function Decoder(messageReader, deepWrap, typeDecoder) {
  this._messageReader = messageReader;
  this._typeDecoder = typeDecoder || new TypeDecoder();
  this._deepWrap = deepWrap || false;
  this._tasks = new TaskSequence();
}

/*
 * TODO(bprosnitz) We will want to be able to decode when we get callbacks.
 * Revisit this API.
 */
/**
 * Decodes the next object off of the message reader.
 * @return {object} The next object or null if no more objects are available.
 */
Decoder.prototype.decode = function(cb) {
  var def = new Deferred(cb);
  var decoder = this;
  this._tasks.addTask(function() {
    return decoder._messageReader.nextMessageType(decoder._typeDecoder).
      then(function(type) {
      if (type === null) {
        return null;
      }
      var reader = decoder._messageReader.rawReader;
      return decoder._decodeValue(type, reader, true);
    }).then(function(v) {
      def.resolve(v);
    }, function(err) {
      def.reject(err);
    });
  });
  return def.promise;
};

Decoder.prototype._decodeValue = function(t, reader, shouldWrap) {
  return this._decodeUnwrappedValue(t, reader).then(function(value) {
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
  });
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
      return reader.readFloat().then(function(real) {
         return reader.readFloat().then(function(imag) {
           return {
             real: real,
             imag: imag
           };
         });
      });
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
      var decoder = this;
      var typeId;
      return reader.readUint().then(function(tId) {
        typeId = tId;
        return decoder._typeDecoder.lookupType(typeId);
      }).then(function(type) {
        if (type === undefined) {
          throw new Error('Undefined type for TYPEOBJECT id ' + typeId);
        }
        return type;
      });

    default:
      return Promise.reject(new Error('Support for decoding kind ' + t.kind +
        ' not yet implemented'));
  }
};

Decoder.prototype._decodeEnum = function(t, reader) {
  return reader.readUint().then(function(index) {
    if (t.labels.length <= index) {
      throw new Error('Invalid enum index ' + index);
    }
    return t.labels[index];
  });
};

Decoder.prototype._decodeList = function(t, reader) {
  var decoder = this;
  return reader.readUint().then(function(len) {
    return decoder._readSequence(t, len, reader);
  });
};

Decoder.prototype._decodeArray = function(t, reader) {
  var decoder = this;
  // Consume the zero byte at the beginning of the array.
  return reader.readByte().then(function(b) {
    if (b !== 0) {
      throw new Error('Unexpected length ' + b);
    }
    return decoder._readSequence(t, t.len, reader);
  });
};

Decoder.prototype._readSequence = function(t, len, reader) {
  if (t.elem.kind === kind.BYTE) {
    // Read byte sequences directly into Uint8Arrays.

    // The Uint8Array is created by calling subarray. In node, this means that
    // its buffer points to the whole binary_reader buffer. To fix this, we
    // recreate the Uint8Array here to avoid exposing it.
    return reader._readRawBytes(len).then(function(b) {
      return new Uint8Array(b);
    });
  }

  var arr = new Array(len);
  var i = 0;
  var decoder = this;
  return promiseFor(len, function() {
    return decoder._decodeValue(t.elem, reader, false).then(function(val) {
      arr[i] = val;
      i++;
    });
  }).then(function() {
    return arr;
  });
};

Decoder.prototype._decodeSet = function(t, reader) {
  var decoder = this;
  var s = new Set();
  return reader.readUint().then(function(len) {
    return promiseFor(len, function() {
      return decoder._decodeValue(t.key, reader, false).then(function(key) {
        s.add(key);
      });
    });
  }).then(function() {
    return s;
  });
};

Decoder.prototype._decodeMap = function(t, reader) {
  var decoder = this;
  return reader.readUint().then(function(len) {
    var m = new Map();
    var i = 0;
    if (len > 0) {
      return decoder._decodeValue(t.key, reader, false).then(handleKey);
    }
    return m;

    function handleKey(key) {
      return decoder._decodeValue(t.elem, reader, false).then(function(value) {
        m.set(key, value);
        i++;
        if (i < len) {
          return decoder._decodeValue(t.key, reader, false).then(handleKey);
        }
        return m;
      });
    }
  });
};

Decoder.prototype._decodeStruct = function(t, reader) {
  var decoder = this;
  var Ctor = Registry.lookupOrCreateConstructor(t);
  var obj = Object.create(Ctor.prototype);

  return promiseWhile(notEndByte, readField).then(function() {
    return obj;
  });
  function notEndByte() {
    return reader.tryReadControlByte().then(function(ctrl) {
      if (ctrl === endByte) {
        return false;
      }

      if (ctrl) {
        throw new Error('Unexpected control byte ' + ctrl);
      }
      return true;
    });
  }
  function readField() {
    var name = '';
    return reader.readUint().then(function(nextIndex) {
      if (t.fields.length <= nextIndex) {
        throw new Error('Struct index ' + nextIndex + ' out of bounds');
      }
      var field = t.fields[nextIndex];
      name = util.uncapitalize(field.name);
      return decoder._decodeValue(field.type, reader, false);
    }).then(function(val) {
      obj[name] = val;
    });
  }
};

Decoder.prototype._decodeOptional = function(t, reader) {
  var decoder = this;
  return reader.peekByte().then(function(isNil) {
    if (isNil === nilByte) {
      // We don't have to wait for the read to finish.
      reader.readByte();
      return null;
    }
    return decoder._decodeValue(t.elem, reader, false);
  });
};

Decoder.prototype._decodeAny = function(reader) {
  var decoder = this;
  return reader.tryReadControlByte().then(function(ctrl) {
    if (ctrl === nilByte) {
      return null;
    }

    if (ctrl) {
      throw new Error('Unexpected control byte ' + ctrl);
    }
    var typeId;
    return reader.readUint().then(function(tId) {
      typeId = tId;
      return decoder._typeDecoder.lookupType(typeId);
    }).then(function(type) {
      if (type === undefined) {
        throw new Error('Undefined typeid ' + typeId);
      }
      return decoder._decodeValue(type, reader, true);
    });
  });
};

Decoder.prototype._decodeUnion = function(t, reader) {
  var decoder = this;
  var field;
  // Find the Union field that was set and decode its value.
  return reader.readUint().then(function(fieldIndex) {
    if (t.fields.length <= fieldIndex) {
      throw new Error('Union index ' + fieldIndex + ' out of bounds');
    }
    field = t.fields[fieldIndex];
    return decoder._decodeValue(field.type, reader, false);
  }).then(function(val) {
    // Return the Union with a single field set to its decoded value.
    var Ctor = Registry.lookupOrCreateConstructor(t);
    var obj = Object.create(Ctor.prototype);
    obj[util.uncapitalize(field.name)] = val;
    return obj;
  });
};
