/**
 * @fileoverview Defines the function that checks for type compatibility.
 * This logic duplicates that of veyron2/vdl/compatible.go
 * Compatible: Two types can potentially convert to each other.
 * Convertible: A value with one type can be converted to a second type.
 * See canonicalize.js for the function that converts a value to a given type.
 */

var Kind = require('./kind.js');
var Types = require('./types.js');
require('./es6-shim');

module.exports = compatible;

/*
 * Returns whether or not these types are compatible with each other.
 * @param {Type | undefined} a The first type (undefined for native values)
 * @param {Type | undefined} b The second type (undefined for native values)
 * @return {boolean} Whether or not the types are compatible.
 */
function compatible(a, b) {
  return compat(a, b, new Set(), new Set());
}

/*
 * Helper for compatible. Uses seen maps to help detect cycles.
 * @param {Type | undefined} a The first type (undefined for native values)
 * @param {Type | undefined} b The second type (undefined for native values)
 * @param {set[Type]} seenA The set of types seen from the original a type.
 * @param {set[Type]} seenB The set of types seen from the original b type.
 * @return {boolean} Whether or not the types are compatible.
 */
function compat(a, b, seenA, seenB) {
  // Native types are always compatible with everything.
  if (a === undefined || b === undefined) {
    return true;
  }

  // Drop optionals. ?foo is compatible with foo.
  if (a.kind === Kind.OPTIONAL) {
    a = a.elem;
  }
  if (b.kind === Kind.OPTIONAL) {
    b = b.elem;
  }

  // If the types match, return true.
  // Note: Allow recursive types to be compatible to avoid infinite loop.
  // Like compatible.go, this returns true if any cycles are detected. This
  // avoids infinite loops and simpler checks at the cost of a little more work
  // in canonicalize. Recursive types are rare, so this doesn't matter much.
  // TODO(alexfandrianto): JS Sets actually allow us to detect shared references
  // So this may be solvable on our end. Go cannot do so very efficiently.
  if (a === b || seenA.has(a) || seenB.has(b)) {
    return true;
  }
  seenA.add(a);
  seenB.add(b);

  var ka = a.kind;
  var kb = b.kind;

  // Any is always compatible with everything.
  if (ka === Kind.ANY || kb === Kind.ANY) {
    return true;
  }

  // Numbers are only compatible with numbers.
  var nA = isNumber(a);
  var nB = isNumber(b);
  if (nA || nB) {
    return nA && nB;
  }

  // Booleans are only compatible with booleans.
  if (ka === Kind.BOOL || kb === Kind.BOOL) {
    return ka === Kind.BOOL && kb === Kind.BOOL;
  }

  // Type objects are only compatible with type objects.
  if (ka === Kind.TYPEOBJECT || kb === Kind.TYPEOBJECT) {
    return ka === Kind.TYPEOBJECT && kb === Kind.TYPEOBJECT;
  }

  // Handle string, enum, []byte here.
  // TODO(alexfandrianto): Huh? Why is []byte special?
  // It should be convertible to []uint16, right?
  var sA = isStringEnumBytes(a);
  var sB = isStringEnumBytes(b);
  if (sA || sB) {
    return sA && sB;
  }

  // Handle composites types.
  switch(ka) {
    case Kind.ARRAY:
    case Kind.LIST:
      switch(kb) {
        case Kind.ARRAY:
        case Kind.LIST:
          return compat(a.elem, b.elem, seenA, seenB);
      }
      return false;
    case Kind.SET:
      switch(kb) {
        case Kind.SET:
          return compat(a.key, b.key, seenA, seenB);
        case Kind.MAP:
          // Note: Swap a and b. The helper needs a map first.
          return compatMapKeyElem(b, a.key, Types.BOOL, seenB, seenA);
        case Kind.STRUCT:
          // Note: Swap a and b. The helper needs a struct first.
          return compatStructKeyElem(b, a.key, Types.BOOL, seenB, seenA);
      }
      return false;
    case Kind.MAP:
      switch(kb) {
        case Kind.SET:
          return compatMapKeyElem(a, b.key, Types.BOOL, seenA, seenB);
        case Kind.MAP:
          return compatMapKeyElem(a, b.key, b.elem, seenA, seenB);
        case Kind.STRUCT:
          // Note: Swap a and b. The helper needs a struct first.
          return compatStructKeyElem(b, a.key, a.elem, seenA, seenB);
      }
      return false;
    case Kind.STRUCT:
      switch(kb) {
        case Kind.SET:
          return compatStructKeyElem(a, b.key, Types.BOOL, seenA, seenB);
        case Kind.MAP:
          return compatStructKeyElem(a, b.key, b.elem, seenB, seenA);
        case Kind.STRUCT:
          // Special: empty struct is compatible to all other structs
          if (isEmptyStruct(a) || isEmptyStruct(b)) {
            return true;
          }
          return compatFields(a, b, seenA, seenB);
      }
      return false;
    case Kind.UNION:
      switch (kb) {
        case Kind.UNION:
          return compatFields(a, b, seenA, seenB);
      }
      return false;
    default:
      throw new Error('compatible received unhandled types ' + a.toString() +
        ' and ' + b.toString());
  }
}

// Helper to determine if a map and a key-elem combo are compatible.
// Requirement: a is a map type.
// Keys and elems must be compatible.
function compatMapKeyElem(a, bKey, bElem, seenA, seenB) {
  return compat(a.key, bKey, seenA, seenB) &&
    compat(a.elem, bElem, seenA, seenB);
}

// Helper to determine if a struct and a key-elem combo are compatible.
// Requirement: a is a struct type.
// Key must be string-compatible, elem must be compatible with all struct fields
function compatStructKeyElem(a, bKey, bElem, seenA, seenB) {
  if (isEmptyStruct(a)) {
    return false; // empty struct can't convert to map/set
  }
  if (!compat(Types.STRING, bKey, seenA, seenB)) {
    return false;
  }
  for (var i = 0; i < a.fields.length; i++) {
    if (!compat(a.fields[i].type, bElem, seenA, seenB)) {
      return false;
    }
  }
  return true;
}


// Helper to determine if a struct or union's fields match.
// Requirement: a and b are struct or union types.
// Name matches must have compatible types, with at least 1 match.
function compatFields(a, b, seenA, seenB) {
  var fieldMatches = false;

  // Go through each field combination.
  for (var i = 0; i < a.fields.length; i++) {
    var fieldA = a.fields[i];
    for (var j = 0; j < b.fields.length; j++) {
      var fieldB = b.fields[j];

      // As soon as any name matches, stop to inspect.
      if (fieldA.name !== fieldB.name) {
        continue;
      } else {
        var typeMatch = compat(fieldA.type, fieldB.type, seenA, seenB);
        // Return false if despite a name match, the types did not.
        if (!typeMatch) {
          return false;
        }
        fieldMatches = true;
        break;
      }
    }
  }
  return fieldMatches;
}

// Helper to determine if the type represents a number.
function isNumber(t) {
  switch(t.kind) {
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
      return true;
  }
  return false;
}

// Helper to determine if the type is a string, enum, or byte array/slice.
function isStringEnumBytes(t) {
  return t.kind === Kind.STRING || t.kind === Kind.ENUM ||
    (t.kind === Kind.LIST && t.elem.kind === Kind.BYTE) ||
    (t.kind === Kind.ARRAY && t.elem.kind === Kind.BYTE);
}

// Helper to determine if this struct is empty.
// Requirement: t is a struct.
function isEmptyStruct(t) {
  return t.fields.length === 0;
}
