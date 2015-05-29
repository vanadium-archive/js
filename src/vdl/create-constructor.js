// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Defines a function that creates a constructor for the specified type.

var kind = require('./kind.js');
var canonicalize = require('./canonicalize.js');

// TODO(bprosnitz) Test generated constructor pass validation logic.

// TODO(bprosnitz) This constructor (and others) are problematic with cycles
// (need to update all references). Should we change this?

// Create a constructor
// @param {Type} type The type to create a constructor for.
// (visible during debugging).
module.exports = function createConstructor(type) {
  var constructor;
  switch (type.kind) {
    case kind.OPTIONAL:
    case kind.ANY:
    case kind.BOOL:
    case kind.BYTE:
    case kind.UINT16:
    case kind.UINT32:
    case kind.UINT64:
    case kind.INT16:
    case kind.INT32:
    case kind.INT64:
    case kind.FLOAT32:
    case kind.FLOAT64:
    case kind.COMPLEX64:
    case kind.COMPLEX128:
    case kind.STRING:
    case kind.ENUM:
    case kind.TYPEOBJECT:
    // TODO(bprosnitz) Should we treat collections differently?
    case kind.SET:
    case kind.MAP:
    case kind.ARRAY:
    case kind.LIST:
      constructor = createWrappedConstructor();
      break;
    case kind.UNION:
    case kind.STRUCT:
      constructor = createStructConstructor();
      break;
    default:
      throw new Error('Cannot create constructor for type of kind: ' +
        type.kind);
  }

  constructor.prototype._type = type;
  if (type.hasOwnProperty('name')) {
    // if displayName is set, the browser will show it as the
    // function name when debugging.
    // Note: full support for this in chrome is in progress.
    constructor.displayName = 'TypeConstructor[' + type.name + ']';
  } else {
    constructor.displayName = 'TypeConstructor';
  }
  return constructor;
};

function createStructConstructor() {
  /**
   * StructConstructor constructs struct-like values like Union and Struct.
   * Any data given to this constructor will be canonicalized.
   * Note: If val is omitted, then the 'zero-value' will be generated.
   * @private
   * @param{object=} val The value whose fields will be copied into this object.
   * @param{boolean=} deepWrap Whether to deepWrap or not. Defaults to false.
   */
  return function StructConstructor(val, deepWrap) {
    deepWrap = deepWrap || false;
    if (!(this instanceof StructConstructor)) {
      return new StructConstructor(val, deepWrap);
    }
    // Canonicalize the given value and copy the resultant fields.
    var cpy = deepWrap ?
      canonicalize.fill(val, this._type) :
      canonicalize.construct(val, this._type);

    for (var fieldName in cpy) {
      if (!cpy.hasOwnProperty(fieldName)) {
        continue;
      }
      this[fieldName] = cpy[fieldName];
    }
  };
}

function createWrappedConstructor() {
  /**
   * WrappedConstructor constructs an object with a 'val' field.
   * Any data given to this constructor will be canonicalized.
   * Note: If val is omitted, then the 'zero-value' will be generated.
   * @private
   * @param{object=} val The value, which will be assigned to 'val'.
   * @param{boolean=} deepWrap Whether to deepWrap or not. Defaults to false.
   */
  var constructor = function WrappedConstructor(val, deepWrap) {
    deepWrap = deepWrap || false;
    if (!(this instanceof WrappedConstructor)) {
      return new WrappedConstructor(val, deepWrap);
    }
    var ideal = deepWrap ?
      canonicalize.fill(val, this._type) :
      canonicalize.reduce(val, this._type);
    this.val = ideal.val;
  };
  constructor.prototype._wrappedType = true;
  constructor.prototype.toString = function() {
    return '' + this.val;
  };
  return constructor;
}
