// Defines a function that creates a constructor for the specified type.

var Kind = require('./kind.js');
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
    case Kind.NILABLE:
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
    case Kind.ENUM:
    case Kind.TYPEOBJECT:
    // TODO(bprosnitz) Should we treat collections differently?
    case Kind.SET:
    case Kind.MAP:
    case Kind.ARRAY:
    case Kind.LIST:
      constructor = createWrappedConstructor();
      break;
    case Kind.ONEOF:
    case Kind.STRUCT:
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
   * StructConstructor constructs struct-like values like OneOf and Struct.
   * Any data given to this constructor will be canonicalized.
   * Note: If val is omitted, then the 'zero-value' will be generated.
   * @param{object=} val The value whose fields will be copied into this object.
   * @param{boolean=} deepWrap Whether to deepWrap or not. Defaults to false.
   */
  return function StructConstructor(val, deepWrap) {
    deepWrap = deepWrap || false;
    if (!(this instanceof StructConstructor)) {
      return new StructConstructor(val, deepWrap);
    }
    // Canonicalize the given value and copy the resultant fields.
    var cpy = canonicalize.value(val, this._type, deepWrap);

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
   * @param{object=} val The value, which will be assigned to 'val'.
   * @param{boolean=} deepWrap Whether to deepWrap or not. Defaults to false.
   */
  var constructor = function WrappedConstructor(val, deepWrap) {
    deepWrap = deepWrap || false;
    if (!(this instanceof WrappedConstructor)) {
      return new WrappedConstructor(val, deepWrap);
    }
    var ideal = canonicalize.value(val, this._type, deepWrap);
    this.val = ideal.val;
  };
  constructor.prototype._wrappedType = true;
  return constructor;
}
