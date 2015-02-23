/**
 * @fileoverview Defines a canonicalizer that returns a validated value ready
 * for encoding. Any undefined values will be filled with their corresponding
 * zero-values. This validated value is a modified copy of the given value.
 * Canonicalizing a canonicalized value with the same type is a no-op.
 */

var BigInt = require('./big-int.js');
var Complex = require('./complex.js');
var Kind = require('./kind.js');
var Registry; // Must be lazily required to avoid circular dependency.
var Types = require('./types.js');
var Type = require('./type.js');
var TypeUtil = require('./type-util.js');
var guessType = require('./guess-type.js');
var jsValueConvert = require('./js-value-convert.js');
var util = require('./util.js');
var stringify = require('./stringify.js');
var typeCompatible = require('./type-compatible.js');
var typeObjectFromKind = require('./type-object-from-kind.js');
var errorConversion = require('./error-conversion');
require('./es6-shim');

module.exports = {
  value: canonicalizeExternal,
  type: canonicalizeTypeExternal,
  zero: canonicalizeZero,
  fill: canonicalizeFill,
  reduce: canonicalizeReduce
};

// Define the zero BigInt a single time, for use in the zeroValue function.
var ZERO_BIGINT = new BigInt(0, new Uint8Array());


/**
 * Alias for canonicalizeExternal with deepWrap = false
 */
function canonicalizeFill(inValue, t) {
  return canonicalizeExternal(inValue, t, true);
}

/**
 * Alias for canonicalizeExternal with deepWrap = true
 */
function canonicalizeReduce(inValue, t) {
  return canonicalizeExternal(inValue, t, false);
}

/**
 * Alias for canonicalizeExternal with inValue = undefined
 */
function canonicalizeZero(t, deepWrap) {
  return canonicalizeExternal(undefined, t, deepWrap);
}

/**
 * Examines the given value and uses the type to return a canonicalized value.
 * The canonicalization process fills in zero-values wherever needed.
 * If the given value is undefined, its zero-value is returned.
 * TODO(alexfandrianto): The performance is on the same order as encode, but it
 * would be a good idea to consider adding more improvements.
 *
 * @param {any} inValue The value to be canonicalized
 * @param {Type} t The target type
 * @param {boolean=} deepWrap Whether or not to deeply wrap. Defaults to true.
 * @return {any} The canonicalized value (May potentially refer to v)
 */
function canonicalizeExternal(inValue, t, deepWrap) {
  if (deepWrap === undefined) {
    deepWrap = true;
  }

  // Canonicalize the given value as a top-level value.
  var inType = TypeUtil.isTyped(inValue) ? inValue._type : undefined;
  return canonicalize(inValue, inType, t, deepWrap, new Map(), true);
}

/**
 * Helper function for canonicalizeExternal.
 * Keeps track of a Map of old references to new references. This helps clone
 * cycles and preserve shared references.
 *
 * @param {any} v The value to be canonicalized
 * @param {Type} inType The inferred type of the value. This type is tracked in
 *                      order to ensure that internal any keys/elems/fields are
 *                      properly filled in with type information.
 * @param {Type} t The target type
 * @param {boolean} deepWrap Whether or not to deeply wrap the contents.
 * @param {object} seen A cache from old to new
 * references that based on type.
 * @param {boolean} isTopLevelValue If true, then the return value is wrapped
 * @return {any} The canonicalized value (May potentially refer to v)
 */
function canonicalize(inValue, inType, t, deepWrap, seen, isTopLevelValue) {
  if (!(t instanceof Type)) {
    t = new Type(t);
  }

  // This value needs a wrapper if either flag is set.
  var needsWrap = deepWrap || isTopLevelValue;

  // Special case JSValue. Convert the inValue to JSValue form.
  var isJSValue = Types.JSVALUE.equals(t);
  if (isJSValue) {
    inValue = jsValueConvert.fromNative(inValue);
  }

  // Check for type convertibility; fail early if the types are incompatible.
  if (!typeCompatible(inType, t)) {
    if (inType.kind !== Kind.TYPEOBJECT) {
      throw new TypeError(inType + ' and ' + t +
        ' are not compatible');
    }
  }

  // Special case TypeObject. See canonicalizeType.
  if (t.kind === Kind.TYPEOBJECT) {
    return canonicalizeType(inValue, seen);
  }

  // The outValue is an object associated with a constructor based on its type.
  // We pre-allocate wrapped values and add them to seen so that they can be
  // referenced in canonicalizeInternal (types may have recursive references).
  var outValue = getObjectWithType(t);
  var cacheType = outValue._type;

  // Only top-level values and primitives should be wrapped unless deep wrapping
  // is enabled; in this case outValue, is set to null.
  if (!needsWrap && outValue._wrappedType) {
    outValue = null;
  }

  // Seen maps an inValue and type to an outValue.
  // If the inValue and type combination already have a cached value, then that
  // is returned. Otherwise, the outValue is put into the seen cache.
  // This ensures that shared references are preserved by canonicalize.
  var cached = getFromSeenCache(seen, inValue, cacheType);
  if (cached !== undefined) {
    return cached;
  }
  var shouldCache = (inValue !== null && typeof inValue === 'object' &&
    outValue !== null);
  if (shouldCache) {
    insertIntoSeenCache(seen, inValue, cacheType, outValue);
  }

  // Call canonicalizeInternal to perform the bulk of canonicalization.
  // canonValue === outValue in the case of Objects, but not primitives.
  // TODO(alexfandrianto): A little inaccurate. Map/Set/Array/Uint8Array, etc.
  // These are all considered primitive at the moment, but they can attach an
  // _type as a field using Object.define.
  var canonValue;
  var v;
  if (t.kind === Kind.ANY) {
    // TODO(alexfandrianto): This logic is complex and unwieldy.
    // See https://github.com/veyron/release-issues/issues/1149

    // The inValue could be wrapped, unwrapped, or potentially even multiply
    // wrapped with ANY. Unwrap the value and guess its type.
    var dropped = unwrapAndGuessType(inValue);
    v = dropped.unwrappedValue;

    // Note: guessType is Types.ANY whenever v is null or undefined.
    // However, we should use inType if present.
    var guessedType = dropped.guessedType;
    if (inType && inType.kind !== Kind.ANY) {
      guessedType = inType;
    }

    if (guessedType.kind === Kind.ANY) {
      canonValue = null;
    } else {
      // The value inside an ANY needs to be canonicalized as a top-level value.
      canonValue = canonicalize(v, guessedType, guessedType, deepWrap, seen,
        true);
    }
  } else {
    v = TypeUtil.unwrap(inValue);
    canonValue = canonicalizeInternal(deepWrap, v, inType, t, seen, outValue);
  }

  // Non-structLike types may need to wrap the clone with a wrapper constructor.
  if (needsWrap && outValue !== null && outValue._wrappedType) {
    outValue.val = canonValue;
    return outValue;
  }

  // Special case JSValue. If !deepWrap, convert the canonValue to native form.
  if (isJSValue && !deepWrap) {
    return jsValueConvert.toNative(canonValue);
  }

  return canonValue;
}

/**
 * Helper function to decode a native number from a BigInt.
 *
 * Since this contains a try/catch, it cannot be optimized and thus should not
 * be in-lined in a larger function.
 */
function decodeNativeNumber(v, t) {
  try {
    return BigInt.fromNativeNumber(v);
  } catch(e) {
    throw makeError(v, t, e);
  }
}

/**
 * Helper function for canonicalize, which canonicalizes and validates on an
 * unwrapped value.
 */
function canonicalizeInternal(deepWrap, v, inType, t, seen, outValue) {
  // Any undefined value obtains its zero-value.
  if (v === undefined) {
    var zero = zeroValue(t);

    // The deepWrap flag affects whether the zero value needs internal wrapping.
    // Without it, the zero value is correct.
    if (!deepWrap) {
      return zero;
    }

    // Otherwise, canonicalize but remove the top-level wrapping.
    // The top-level will be reapplied by this function's caller.
    return TypeUtil.unwrap(canonicalize(zero, inType, t, true, seen, false));
  } else if (v === null && (t.kind !== Kind.ANY && t.kind !== Kind.OPTIONAL)) {

    // Convert null to the zero-value in the case of converting optional to its
    // non-optional type.
    var isCompatOptional = inType && inType.kind === Kind.OPTIONAL &&
      typeCompatible(inType.elem, t);
    if (isCompatOptional) {
      v = zeroValue(inType.elem);
    } else {
      throw makeError(v, t, 'value is null for non-optional type');
    }
  }

  // If this an error type, we need to convert to the correct
  // error object.  An error type can either be the optional error (i.e
  // Types.ERROR) or a concrete error (i.e. Types.ERROR.elem).
  if (t.equals(Types.ERROR)) {
    if (!v) {
      return null;
    }
    // We don't just return the error, instead we defer to the rest of
    // the canonicalize logic to determine where or not return wrapped
    // values.
    v = errorConversion.toJSerror(TypeUtil.unwrap(v));
  }

  if (t.equals(Types.ERROR.elem)) {
    outValue = errorConversion.toJSerror(v);
  }

  var inKeyType = inType ? inType.key : undefined;
  var inElemType = inType ? inType.elem : undefined;
  var inFieldType;
  var key;
  var i;
  // Otherwise, the value is defined; validate it and canonicalize the value.
  switch(t.kind) {
    case Kind.ANY:
      // Any values are canonicalized with their internal value instead.
      throw new Error('Unreachable; Any values are always extracted and then ' +
        'canonicalized.');
    case Kind.OPTIONAL:
      // Verify the value is null or the correct Optional element.
      if (v === null) {
        return null;
      }
      return canonicalize(v, inElemType, t.elem, deepWrap, seen,
        false);
    case Kind.BOOL:
      // Verify the value is a boolean.
      if (typeof v !== 'boolean') {
        throw makeError(v, t, 'value is not a boolean');
      }
      return v;
    case Kind.BYTE:
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.INT16:
    case Kind.INT32:
    case Kind.FLOAT32:
    case Kind.FLOAT64:
      // Verify that the value is a number. Convert BigInt to number.
      // TODO(alexfandrianto): We eventually throw an error if we encode a float
      // as an int, but we may want to apply a floor/round function here.
      if (typeof v === 'number') {
        return v;
      } else if (v instanceof BigInt) {
        return v.toNativeNumber();
      }
      throw makeError(v, t, 'value is not a number');
    case Kind.UINT64:
    case Kind.INT64:
      if (typeof v === 'number') {
        return decodeNativeNumber(v, t);
      } else if (v instanceof BigInt) {
        // BigInt is not mutable, so we don't need to send a copy to the cache.
        return v;
      }
      throw makeError(v, t, 'value is not a number or BigInt');
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
      // TODO(alexfandrianto): We allow normal object for Complex, but not for
      // BigInt. The latter is more complex, but we are being inconsistent.
      if (typeof v === 'number') {
        return new Complex(v, 0);
      } else if (typeof v === 'object' &&
        (typeof v.real === 'undefined' || typeof v.real === 'number') &&
        (typeof v.imag === 'undefined' || typeof v.imag === 'number')) {
        return new Complex(v.real, v.imag);
      }
      throw makeError(v, t, 'value is not a number or object of the form ' +
        '{ real: <number>, imag: <number> }');
    case Kind.STRING:
      // Verify that the value is a string.
      if (typeof v !== 'string') {
        throw makeError(v, t, 'value is not a string');
      }
      return v;
    case Kind.ENUM:
      // Enum is lenient, allowing either a label index or label string.
      // The return value on success is the label string.
      if (typeof v === 'number') {
        outValue = t.labels[v];
        if (v === undefined) {
          throw makeError(v, t, 'value refers to bad label index: ' + v);
        }
        return outValue;
      }
      if (typeof v !== 'string') {
        throw makeError(v, t, 'value refers to non-string label: ' +
          stringify(v));
      }
      var labelIndex = t.labels.indexOf(v);
      if (labelIndex === -1) {
        throw makeError(v, t, 'value refers to unexpected label: ' + v);
      }
      return v;
    case Kind.TYPEOBJECT:
      // TypeObjects are canonicalized with a fake type, so they should never
      // reach this case.
      throw new Error('Unreachable; TypeObjects use canonicalizeType.');
    case Kind.LIST:
    case Kind.ARRAY:
      // Verify the list/array and its internal contents.
      // Arrays cannot be too long.
      var neededLen = v.length;
      if (t.kind === Kind.ARRAY) {
        if (v.length > t.len) {
          throw makeError(v, t, 'value has length ' + v.length +
            ', which exceeds type length ' + t.len);
        }
        neededLen = t.len;
      }

      // Type-check the List/Array by kind.
      if (t.elem.kind === Kind.BYTE) {
        if (!(v instanceof Uint8Array)) {
          // TODO(bprosnitz) Support more (e.g, UintXArray, str encodings, etc.)
          throw makeError(v, t, 'value is not Uint8Array');
        }
        // Make a copy of only the relevant Uint8Array bytes. Excess buffer
        // bytes are not copied over.
        outValue = new Uint8Array(v);
        return outValue;
      } else {
        if (!Array.isArray(v)) {
          throw makeError(v, t, 'value is not an Array');
        }
        outValue = new Array(neededLen);
      }

      // Then canonicalize the internal values of the array.
      for (var arri = 0; arri < neededLen; arri++) {
        var e = canonicalize(v[arri], inElemType, t.elem, deepWrap, seen,
          false);
        if (t.elem.kind === Kind.BYTE && deepWrap) {
          e = e.val; // Uint8Array doesn't accept wrapped values.
        }
        outValue[arri] = e;
      }
      return outValue;
    case Kind.SET:
      // Verify that the value can be converted to an ES6 Set; return that copy.
      if (typeof v !== 'object') {
        throw makeError(v, t, 'value is not an object');
      } else if (v instanceof Map) {
        throw makeError(v, t, 'value is a Map, not a Set');
      } else if (!(v instanceof Set) && !Array.isArray(v)) {
        if (t.key.kind !== Kind.STRING) {
          throw makeError(v, t, 'cannot encode Object as VDL set with ' +
            'non-string key type. Use Set instead.');
        }
        v = objectToSet(v); // v now refers to a Set instead of an Object.
      }

      // Recurse: Validate internal keys.
      outValue = new Set();
      v.forEach(function(value) {
        outValue.add(canonicalize(value, inKeyType, t.key, deepWrap, seen,
          false));
      });

      return outValue;
    case Kind.MAP:
      // Verify that the value can be converted to an ES6 Map; return that copy.
      if ((typeof v !== 'object') || Array.isArray(v)) {
        throw makeError(v, t, 'value is not a valid Map-type');
      } else if (v instanceof Set) {
        throw makeError(v, t, 'value is a Set, not a Map');
      } else if (!(v instanceof Map)) {
        if (t.key.kind !== Kind.STRING) {
          throw makeError(v, t, 'cannot encode Object as VDL map with ' +
           'non-string key type. Use Map instead.');
        }
        v = objectToMap(v); // v now refers to a Map instead of an Object.
      }

      // Recurse: Validate internal keys and values.
      outValue = new Map();
      v.forEach(function(val, key) {
        outValue.set(
          canonicalize(key, inKeyType, t.key, deepWrap, seen, false),
          canonicalize(val, inElemType, t.elem, deepWrap, seen, false)
        );
      });

      return outValue;
    case Kind.UNION:
      // Verify that the Union contains 1 field, 0-filling if there are none.
      if (typeof v !== 'object' || Array.isArray(v)) {
        throw makeError(v, t, 'value is not an object');
      }

      // TODO(bprosnitz): Ignores properties not defined by the Union type.
      // If we want to throw in such cases, _type would have to be whitelisted.
      var isSet = false;
      for (i = 0; i < t.fields.length; i++) {
        key = t.fields[i].name;
        var lowerKey = util.uncapitalize(key);
        if (v.hasOwnProperty(lowerKey) && v[lowerKey] !== undefined) {
          // Increment count and canonicalize the internal value.
          if (isSet) {
            throw makeError(v, t, '>1 Union fields are set');
          } else {
            inFieldType = inType ? inType.fields[i].type : undefined;
            outValue[lowerKey] = canonicalize(v[lowerKey], inFieldType,
              t.fields[i].type, deepWrap, seen, false);
            isSet = true;
          }
        }
      }

      // If none of the fields were set, then the Union is not valid.
      if (!isSet) {
        throw makeError(v, t, 'none of the Union fields are set');
      }

      // Copy over any private properties without canonicalization.
      copyUnexported(v, outValue);

      return outValue;
    case Kind.STRUCT:
      // Verify that the Struct and all its internal fields.
      if (typeof v !== 'object' || Array.isArray(v)) {
        throw makeError(v, t, 'value is not an Object');
      }

      var upperKey;
      // Ensure that there are no extra struct fields.
      Object.keys(v).filter(util.isExportedStructField).forEach(function(key) {
        upperKey = util.capitalize(key);
        var hasMatchingField = t.fields.some(function fieldMatch(field) {
          return field.name === upperKey;
        });
        if (!hasMatchingField) {
          throw makeError(v, t, 'has unexpected field: ' + upperKey);
        }
      });

      // Copy over any private properties without canonicalization.
      copyUnexported(v, outValue);

      var fields = t.fields;
      for (i = 0; i < fields.length; i++) {
        var fieldName = util.uncapitalize(fields[i].name);
        var fieldType = fields[i].type;

        inFieldType = inType ? inType.fields[i].type : undefined;
        // Each entry needs to be canonicalized too.
        outValue[fieldName] = canonicalize(v[fieldName], inFieldType, fieldType,
          deepWrap, seen, false);
      }

      return outValue;
    default:
      throw new TypeError('Unknown kind ' + t.kind);
  }
}

/**
 * Use the type and its kind to find the proper 0-value.
 * TODO(alexfandrianto): Assumes the type given is valid. Should we validate?
 * For example, we assume all lists lack a len field in their type.
 * zeroValues need further canonicalization, so it would make sense to have it
 * be a simple initializer instead of being recursive.
 * @param(Type) t The type whose zero value is needed.
 * @return {any} the corresponding zero value for the input type.
 */
function zeroValue(t) {
  switch(t.kind) {
    case Kind.ANY:
    case Kind.OPTIONAL:
      return null;
    case Kind.BOOL:
      return false;
    case Kind.BYTE:
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.INT16:
    case Kind.INT32:
    case Kind.FLOAT32:
    case Kind.FLOAT64:
      return 0;
    case Kind.UINT64:
    case Kind.INT64:
      return ZERO_BIGINT;
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
      return new Complex(0, 0);
    case Kind.STRING:
      return '';
    case Kind.ENUM:
      return t.labels[0];
    case Kind.TYPEOBJECT:
      return Types.ANY;
    case Kind.ARRAY:
    case Kind.LIST:
      var len = t.len || 0;
      if (t.elem.kind === Kind.BYTE) {
        return new Uint8Array(len);
      }
      var arr = new Array(len);
      for (var arri = 0; arri < len; arri++) {
        arr[arri] = zeroValue(t.elem);
      }
      return arr;
    case Kind.SET:
      return new Set();
    case Kind.MAP:
      return new Map();
    case Kind.UNION:
      var zeroUnion = {};
      var name = util.uncapitalize(t.fields[0].name);
      zeroUnion[name] = zeroValue(t.fields[0].type);
      return zeroUnion;
    case Kind.STRUCT:
      return t.fields.reduce(function(obj, curr) {
        var name = util.uncapitalize(curr.name);
        obj[name] = zeroValue(curr.type);
        return obj;
      }, {});
    default:
      throw new TypeError('Unknown kind ' + t.kind);
  }
}

/**
 * Constructs an error for the value, type, and custom message.
 * @param {any} value The value
 * @param {Type} type The type
 * @param {string} message The custom error message
 * @return {Error} The constructed error
 */
function makeError(value, type, message) {
  return new TypeError('Value: ' + stringify(value) + ', Type: ' +
    stringify(type) + ' - ' + message);
}

/**
 * Examines the given type and canonicalizes it. If the type is not valid for
 * its kind, then an error is thrown.
 * @param {Type} t The type to be canonicalized
 * @return {Type} The canonicalized type
 * @throws If the type is invalid
 */
function canonicalizeTypeExternal(t) {
  return canonicalizeType(t, new Map());
}

/**
 * Helper function for canonicalizeTypeExternal.
 * Keeps track of a Map of old references to new references. This helps clone
 * cycles and preserve shared references.
 * For unseen types, canonicalizeType calls canonicalize with a per-kind struct
 * representation of TypeObject.
 */
function canonicalizeType(type, seen) {
  if (type === undefined) {
    // We whitelist undefined and return Types.ANY. This check matches
    // canonicalizeValue's undefined => zeroValue(type).
    return zeroValue(Types.TYPEOBJECT);
  } else {
    var cached = getFromSeenCache(seen, type, Types.TYPEOBJECT);
    if (cached !== undefined) {
      return cached;
    }
  }

  if (!type.hasOwnProperty('kind')) {
    throw new TypeError('Kind not specified');
  }
  if (typeof type.kind !== 'number') {
    throw new TypeError('Kind expected to be a number. Got ' + type.kind);
  }

  // The Type for each kind has its own Type Object.
  // Verify deeply that the given type is in the correct form.
  var typeOfType = typeObjectFromKind(type.kind);

  // Call canonicalize with this typeOfType. Even though typeOfType is a Struct,
  // behind the scenes, canonType will be a TypeObject.
  var canonType = canonicalize(type, typeOfType, typeOfType, false, seen,
    false);

  // Certain types may not be named.
  if (type.kind === Kind.ANY || type.kind === Kind.TYPEOBJECT) {
    if (canonType.name !== '') {
      throw makeError(
        canonType,
        typeOfType,
       'Any and TypeObject should be unnamed types');
    }
  }

  // Union needs at least 1 field.
  if (type.kind === Kind.UNION && canonType.fields.length <= 0) {
    throw makeError(canonType, typeOfType, 'union needs >=1 field');
  }

  return canonType;
}

// Copy the unexported struct fields from the value to the copy.
// Do not copy _type and _wrappedType since they would block the prototype.
// TODO(alexfandrianto): Only used in Struct and Union. Do we need it elsewhere?
function copyUnexported(value, copy) {
  Object.keys(value).filter(function(key) {
    return !util.isExportedStructField(key) && key !== '_type' &&
      key !== '_wrappedType';
  }).forEach(function(key) {
    copy[key] = value[key];
  });
}

// Convert the given object into a Set.
function objectToSet(o) {
  var keys = Object.keys(o).filter(util.isExportedStructField);
  return keys.reduce(function(m, key) {
    m.add(key);
    return m;
  }, new Set());
}

// Convert the given object into a Map.
function objectToMap(o) {
  var keys = Object.keys(o).filter(util.isExportedStructField);
  return keys.reduce(function(m, key) {
    m.set(key, o[key]);
    return m;
  }, new Map());
}

/**
 * Creates an empty object with the correct Constructor and prototype chain.
 * @param {type} type The proposed type whose constructor is needed.
 * @return {object} The empty object with correct type
 */
function getObjectWithType(t) {
  // Get the proper constructor from the Registry.
  Registry = Registry || require('./registry.js');
  var Constructor = Registry.lookupOrCreateConstructor(t);

  // Then make an empty object with that constructor.
  var obj = Object.create(Constructor.prototype);
  Object.defineProperty(obj, 'constructor', { value: Constructor });
  return obj;
}

/**
 * insertIntoSeenCache adds the new reference into the cache.
 * @param {object} seen Cache of old to new refs by type.
 * @param {object} oldRef The old reference
 * @param {Type} type The type the new reference is being cached under.
 * @param {object} newRef The new reference
 */
function insertIntoSeenCache(seen, oldRef, type, newRef) {
  if (!seen.has(oldRef)) {
    seen.set(oldRef, new Map());
  }
  seen.get(oldRef).set(type, newRef);
}

/**
 * getFromSeenCache returns a cached value from the seen cache.
 * If there is no such value, the function returns undefined.
 * @param {object} seen Cache of old to new refs by type.
 * @param {object} oldRef The old reference
 * @param {Type} type The type the new reference is being cached under.
 * @return {object | undefined} The cached value or undefined, if not present.
 */
function getFromSeenCache(seen, oldRef, type) {
  if (seen.has(oldRef) && seen.get(oldRef).has(type)) {
    return seen.get(oldRef).get(type);
  }
  return;
}

/**
 * Recursively unwraps v to drop excess ANY. Guesses the type, after.
 * Ex: null => { unwrappedValue: undefined, guessedType: Types.ANY }
 * Ex: { val: null, of type ANY } =>
 *     { unwrappedValue: undefined, guessedType: Types.ANY }
 * Ex: ANY in ANY with null =>
 *     { unwrappedValue: undefined, guessedType: Types.ANY }
 * Ex: wrapped primitive =>
       { unwrappedValue: primitive, guessedType: typeOfPrimitiveWrapper }
 * Ex: nativeVal => { unwrappedValue: nativeVal, guessedType: Types.JSVALUE }
 * @param{any} v The value which may have nested ANY
 * @return{object} Object with guessedType => type and unwrappedValue => value
 */
function unwrapAndGuessType(v) {
  if (v === null || v === undefined) {
    return {
      unwrappedValue: undefined,
      guessedType: Types.ANY
    };
  }
  var t = guessType(v);
  if (t.kind !== Kind.ANY) {
    return {
      unwrappedValue: v,
      guessedType: t
    };
  }
  return unwrapAndGuessType(TypeUtil.unwrap(v));
}
