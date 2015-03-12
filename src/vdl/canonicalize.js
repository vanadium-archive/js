/**
 * @fileoverview Defines a canonicalizer that returns a validated value ready
 * for encoding. Any undefined values will be filled with their corresponding
 * zero-values. This validated value is a modified copy of the given value.
 * Canonicalizing a canonicalized value with the same type is a no-op.
 * @private
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
var overflow = require('./overflow.js');
var util = require('./util.js');
var stringify = require('./stringify.js');
var typeCompatible = require('./type-compatible.js');
var typeObjectFromKind = require('./type-object-from-kind.js');
var nativeTypeRegistry = require('./native-type-registry');
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

  // If the inType is ANY and inValue's type is ANY, then unwrap and try again.
  // This allows any(foo) to be converted to foo.
  if (Types.ANY.equals(inType) && TypeUtil.isTyped(inValue) &&
    Types.ANY.equals(inValue._type)) {

    return canonicalize(TypeUtil.unwrap(inValue), inValue._type, t, deepWrap,
      seen, isTopLevelValue);
  }

  // Special case TypeObject. See canonicalizeType.
  if (t.kind === Kind.TYPEOBJECT) {
    return canonicalizeType(inValue, seen);
  }

  // TODO(bprosnitz) We need to canonicalize (without native conversion) before
  // passing inValue to fromWireType.
  if (!deepWrap) {
    inValue = nativeTypeRegistry.fromWireValue(t, inValue);
  } else if (inValue !== undefined && inValue !== null) {
    inValue = nativeTypeRegistry.fromNativeValue(inValue);
  }

  // If we have a true native that doesn't have vdl fields in it (i.e. Date),
  // then we can stop canonicalizing.  Other "natives" like VandiumError have
  // nested fields that need to be canonicalized.
  if (nativeTypeRegistry.isNative(inValue) && !TypeUtil.isTyped(inValue)) {
    return inValue;
  }


  // The outValue is an object associated with a constructor based on its type.
  // We pre-allocate wrapped values and add them to seen so that they can be
  // referenced in canonicalizeInternal (types may have recursive references).
  var outValue = getObjectWithType(t, inValue);
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

  // We need to copy the msg field of WireError to the message property of
  // Javascript Errors so that toString() works.
  // TODO(bjornick): We should make this go away when we fix:
  // https://github.com/veyron/release-issues/issues/1279
  if (canonValue instanceof Error) {
    Object.defineProperty(canonValue, 'message', { value: canonValue.msg });
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
    throw makeError(v, t, 'value is null for non-optional type');
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
      // Verify this is a valid number value and then convert.
      if (typeof v === 'number' || v instanceof BigInt || isComplex(v)) {

        // These numbers must be real.
        assertRealNumber(v, t);

        // Non-floats must be integers.
        if (t.kind !== Kind.FLOAT32 && t.kind !== Kind.FLOAT64) {
          assertInteger(v, t);
        }

        // Uints must be non-negative.
        if (t.kind === Kind.BYTE || t.kind === Kind.UINT16 ||
          t.kind === Kind.UINT32) {

          assertNonNegativeNumber(v, t);
        }

        // This also filters out numbers that exceed their bounds.
        return convertToNativeNumber(v, t);
      }
      throw makeError(v, t, 'value is not a number');
    case Kind.UINT64:
    case Kind.INT64:
      // Verify this is a valid number value and then convert.
      if (typeof v === 'number' || v instanceof BigInt || isComplex(v)) {

        // These numbers must be real integers.
        assertRealNumber(v, t);
        assertInteger(v, t);
        if (t.kind === Kind.UINT64) {
          assertNonNegativeNumber(v, t); // also non-negative
        }
        return convertToBigIntNumber(v, t);
      }
      throw makeError(v, t, 'value is not a number or BigInt');
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
      if (typeof v === 'number' || v instanceof BigInt || isComplex(v)) {
        return convertToComplexNumber(v, t);
      }
      throw makeError(v, t, 'value is not a number or object of the form ' +
        '{ real: <number>, imag: <number> }');
    case Kind.STRING:
    case Kind.ENUM:
      // Determine the string representation.
      var str;
      if (typeof v === 'string') {
        str = v;
      } else if (v instanceof Uint8Array) {
        str = uint8ArrayToString(v);
      } else {
        throw makeError(v, t, 'value cannot convert to string');
      }

      // For enums, check that the string actually appears in the labels.
      if (t.kind === Kind.ENUM && t.labels.indexOf(str) === -1) {
        throw makeError(v, t, 'value refers to unexpected label: ' + v);
      }
      return str;
    case Kind.TYPEOBJECT:
      // TypeObjects are canonicalized with a fake type, so they should never
      // reach this case.
      throw new Error('Unreachable; TypeObjects use canonicalizeType.');
    case Kind.LIST:
    case Kind.ARRAY:
      // Verify the list/array and its internal contents.
      // Values whose length exceeds the array length cannot convert.
      var neededLen = v.length;
      if (t.kind === Kind.ARRAY) {
        if (v.length > t.len) {
          throw makeError(v, t, 'value has length ' + v.length +
            ', which exceeds type length ' + t.len);
        }
        neededLen = t.len;
      }

      // Special-case: Byte slices and byte arrays are treated like strings.
      if (t.elem.kind === Kind.BYTE) {
        // Then v can be a string or Uint8Array.
        if (v instanceof Uint8Array) {
          return v;
        }
        if (typeof v === 'string') {
          return uint8ArrayFromString(v, neededLen);
        }
        throw makeError(v, t, 'value is not Uint8Array or string');
      }

      // Check to be sure that we have a normal array.
      if (!Array.isArray(v)) {
        throw makeError(v, t, 'value is not an Array');
      }

      // Fill a placeholder with the canonicalized internal values of the array.
      outValue = new Array(neededLen);
      for (var arri = 0; arri < neededLen; arri++) {
        outValue[arri] = canonicalize(v[arri], inElemType, t.elem, deepWrap,
          seen, false);
      }
      return outValue;
    case Kind.SET:
      // Verify that the value can be converted to an ES6 Set; return that copy.
      if (typeof v !== 'object') {
        throw makeError(v, t, 'value is not an object');
      } else if (v instanceof Map) {
        // Map is allowed to convert to Set, but it could fail.
        v = mapToSet(v, t);
      } else if (!(v instanceof Set) && !Array.isArray(v)) {
        if (t.key.kind !== Kind.STRING) {
          throw makeError(v, t, 'cannot encode Object as VDL set with ' +
            'non-string key type. Use Set instead.');
        }
        v = objectToSet(v);       // v now refers to a Set instead of an Object.
        inKeyType = Types.STRING; // Object keys are strings.
      }

      // Recurse: Validate internal keys.
      outValue = new Set();
      v.forEach(function(value) {
        outValue.add(canonicalize(value, inKeyType, t.key, deepWrap, seen,
          false));
      });

      return outValue;
    case Kind.MAP:
      var useInTypeForElem = false; // Only used for struct/object => Map.

      // Verify that the value can be converted to an ES6 Map; return that copy.
      if ((typeof v !== 'object') || Array.isArray(v)) {
        throw makeError(v, t, 'value is not a valid Map-type');
      } else if (v instanceof Set) {
        // Sets can always upconvert to Maps.
        v = setToMap(v);
        inElemType = Types.BOOL; // Set should use bool as elem type.
      } else if (!(v instanceof Map)) {
        if (t.key.kind !== Kind.STRING) {
          throw makeError(v, t, 'cannot encode Object as VDL map with ' +
           'non-string key type. Use Map instead.');
        }
        v = objectToMap(v);       // v now refers to a Map instead of an Object.
        inKeyType = Types.STRING; // Object keys are strings.
        // inElemType might change every time though! Set a flag.
        useInTypeForElem = true;
      }

      // Recurse: Validate internal keys and values.
      outValue = new Map();
      v.forEach(function(val, key) {
        if (useInTypeForElem && inType && inType.kind === Kind.STRUCT) {
          inElemType = lookupFieldType(inType, key);
        }
        outValue.set(
          canonicalize(key, inKeyType, t.key, deepWrap, seen, false),
          canonicalize(val, inElemType, t.elem, deepWrap, seen, false)
        );
      });

      return outValue;
    case Kind.STRUCT:
      // Verify that the Struct and all its internal fields.
      // TODO(alexfandrianto): We may want to disallow other types of objects
      // (e.g., Uint8Array, Complex, and BigInt).
      if (typeof v !== 'object' || Array.isArray(v)) {
        throw makeError(v, t, 'value is not an Object');
      }

      // Copy over any private properties without canonicalization.
      copyUnexported(v, outValue);

      var fields = t.fields;
      for (i = 0; i < fields.length; i++) {
        var fieldName = fields[i].name;
        var fieldNameLower = util.uncapitalize(fieldName);
        var fieldType = fields[i].type;

        // Gather the correct struct entry (or Map/Set entry) and field type.
        inFieldType = lookupFieldType(inType, fieldName);
        var fieldVal = v[fieldNameLower];
        if (v instanceof Map) {
          fieldVal = v.get(fieldName);
        } else if (v instanceof Set) {
          fieldVal = v.has(fieldName);
        }

        // Each entry needs to be canonicalized too.
        outValue[fieldNameLower] = canonicalize(fieldVal, inFieldType,
          fieldType, deepWrap, seen, false);
      }

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
            // The field indexes may not match, so get the field type by name.
            inFieldType = lookupFieldType(inType, key);
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
    type.toString() + ' - ' + message);
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

  // If the type has a field that is not relevant to its kind, then throw.
  Object.keys(type).forEach(function(key) {
    var upperKey = util.capitalize(key);

    var hasMatch = typeOfType.fields.some(function fieldMatch(field) {
      return field.name === upperKey;
    });
    if (!hasMatch) {
      throw new TypeError('Type has unexpected field ' + key);
    }
  });

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
    m.add(util.capitalize(key));
    return m;
  }, new Set());
}

// Convert the given object into a Map.
function objectToMap(o) {
  var keys = Object.keys(o).filter(util.isExportedStructField);
  return keys.reduce(function(m, key) {
    m.set(util.capitalize(key), o[key]);
    return m;
  }, new Map());
}

// Convert a Set to a Map.
function setToMap(s) {
  var m = new Map();
  s.forEach(function(k) {
    m.set(k, true);
  });
  return m;
}

// Convert a Map to a Set.
function mapToSet(m, t) {
  var s = new Set();
  m.forEach(function(v, k) {
    // Is the value true? Since it may be a wrapped bool, unwrap it.
    if (TypeUtil.unwrap(v) === true) {
      s.add(k);
    } else if (TypeUtil.unwrap(v) !== false) {
      throw makeError(m, t, 'this Map value cannot convert to Set');
    }
  });
  return s;
}

/**
 * Creates an empty object with the correct Constructor and prototype chain.
 * @param {type} type The proposed type whose constructor is needed.
 * @param {v} value The value that is passed in.  If v is a native type,
 * its constructor is used instead of looking up in the registry.
 * @return {object} The empty object with correct type
 */
function getObjectWithType(t, v) {
  // Get the proper constructor from the Registry.
  Registry = Registry || require('./registry.js');
  var Constructor = Registry.lookupOrCreateConstructor(t);

  if (nativeTypeRegistry.isNative(v)) {
    Constructor = v.constructor;
  }

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

/**
 * Finds the correct struct/union field type given a field name.
 * We rely on type compatibility to ensure that only Struct has leeway.
 * Maps use their elem as the field type, while Sets use Types.BOOL.
 */
function lookupFieldType(t, fieldName) {
  if (!t) {
    return undefined;
  }

  // Maps, Sets, Union, and Structs can have a field type by name.
  switch(t.kind) {
    case Kind.MAP:
      return t.elem;
    case Kind.SET:
      return Types.BOOL;
    case Kind.STRUCT:
    case Kind.UNION:
      for (var i = 0; i < t.fields.length; i++) {
        if (t.fields[i].name === fieldName) {
          return t.fields[i].type;
        }
      }
  }
  return undefined;
}

/**
 * Helper function to create a BigInt from a native number.
 *
 * Since this contains a try/catch, it cannot be optimized and thus should not
 * be in-lined in a larger function.
 */
function bigIntFromNativeNumber(v, t) {
  try {
    return BigInt.fromNativeNumber(v);
  } catch(e) {
    throw makeError(v, t, e);
  }
}

/**
 * Helper function to convert from a BigInt to a native number.
 *
 * Since this contains a try/catch, it cannot be optimized and thus should not
 * be in-lined in a larger function.
 */
function bigIntToNativeNumber(v, t) {
  try {
    return v.toNativeNumber();
  } catch(e) {
    throw makeError(v, t, e);
  }
}

// Assumes that v is intended to be a numerical representation.
// Only use this for numerical kinds.
function assertRealNumber(v, t) {
  if ((isComplex(v)) && v.imag !== 0) {
    throw makeError(v, t, 'value is not purely real');
  }
}

// Assumptions made; real number
// Only use this for the numerical kinds.
function assertNonNegativeNumber(v, t) {
  switch(t.kind) {
    case Kind.BYTE:
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.UINT64:
      var isNegative = (v < 0 || ((v instanceof BigInt) && v.getSign() < 0) ||
        ((isComplex(v)) && v.real < 0));
      if (isNegative) {
        throw makeError(v, t, 'value cannot be negative');
      }
  }
}

// Assumptions made; real number
// Only use this for the numerical kinds.
// Assumes that the value given is a real number.
function assertInteger(v, t) {
  switch(t.kind) {
    case Kind.BYTE:
    case Kind.UINT16:
    case Kind.UINT32:
    case Kind.UINT64:
    case Kind.INT16:
    case Kind.INT32:
    case Kind.INT64:
      var isInt;
      if (v instanceof BigInt) {
        isInt = true;
      } else if (isComplex(v)) {
        isInt = (Math.round(v.real) === v.real);
      } else {
        isInt = (Math.round(v) === v);
      }
      if (!isInt) {
        throw makeError(v, t, 'value cannot be a non-integer');
      }
  }
}

// Assumptions made; num is a number
function assertBounds(v, t, num) {
  var top = overflow.getMax(t.kind);
  var bot = overflow.getMin(t.kind);
  if (num > top) {
    throw makeError(v, t, num + ' is too large: max ' + top);
  } else if (num < bot) {
    throw makeError(v, t, num + ' is too small: min ' + bot);
  }
}

// Assumptions made; real integer
// Only use this for the small number kinds.
// TODO(alexfandrianto): We don't distinguish between float32 and float64 yet.
function convertToNativeNumber(v, t) {
  var num = v;
  if (v instanceof BigInt) {
    num = bigIntToNativeNumber(v, t);
  } else if (isComplex(v)) {
    num = v.real;
  }
  assertBounds(v, t, num);
  return num;
}

// Assumptions made; real integer
// Only use this for the UINT64 and INT64 kinds.
function convertToBigIntNumber(v, t) {
  if (v instanceof BigInt) {
    if (v.getUintBytes().length > 8) {
      throw makeError(v, t, 'BigInt has too many bytes');
    }
    return v;
  }
  if (isComplex(v)) {
    return bigIntFromNativeNumber(v.real, t);
  }
  return bigIntFromNativeNumber(v, t);
}

// Assumptions made; number
// Only use this for the Complex64 and Complex128 kinds.
function convertToComplexNumber(v, t) {
  if (v instanceof BigInt) {
    var num = bigIntToNativeNumber(v, t);
    assertBounds(v, t, num);
    return new Complex(num, 0);
  }
  if (isComplex(v)) {
    assertBounds(v, t, v.real);
    assertBounds(v, t, v.imag);
    return new Complex(v.real, v.imag);
  }
  assertBounds(v, t, v);
  return new Complex(v, 0);
}

// Converts a Uint8Array to a string. Converts in chunks to avoid any issues
// with maximum stack call size.
function uint8ArrayToString(arr) {
  var SIZE = 0x8000; // Arbitrary; avoids exceeding max call stack size.
  var chunks = [];
  for (var i = 0; i < arr.length; i += SIZE) {
    chunks.push(String.fromCharCode.apply(null, arr.subarray(i, i+SIZE)));
  }
  return chunks.join('');
}

// Converts a string to a Uint8Array.
// The array may have a length longer than the string.
function uint8ArrayFromString(str, neededLen) {
  var arr = new Uint8Array(neededLen);
  for (var i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

// True if the value given can be treated like a Complex number.
function isComplex(v) {
  return v && (typeof v === 'object') && (typeof v.real === 'number') &&
    (typeof v.imag === 'number');
}
