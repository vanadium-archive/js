// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Defines the function that checks for type compatibility.
 * This logic duplicates that of v23/vdl/compatible.go
 * Compatible: Two types can potentially convert to each other.
 * Convertible: A value with one type can be converted to a second type.
 * See canonicalize.js for the function that converts a value to a given type.
 * @private
 */

var kind = require('./kind.js');
var types = require('./types.js');
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
 * Helper for compatible. Keeps track of the set of ancestors for each type.
 * This chain of ancestors allows detection of recursive types. When detected,
 * the function returns true (potentially, a false positive).
 * @param {Type | undefined} a The first type (undefined for native values)
 * @param {Type | undefined} b The second type (undefined for native values)
 * @param {set[Type]} seenA The set of ancestor types for type a.
 * @param {set[Type]} seenB The set of ancestor types for type b.
 * @return {boolean} Whether or not the types are compatible.
 */
function compat(a, b, seenA, seenB) {
  // Native types are always compatible with everything.
  if (a === undefined || b === undefined) {
    return true;
  }

  // Drop optionals. ?foo is compatible with foo.
  if (a.kind === kind.OPTIONAL) {
    a = a.elem;
  }
  if (b.kind === kind.OPTIONAL) {
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

  var ka = a.kind;
  var kb = b.kind;

  // Any is always compatible with everything.
  if (ka === kind.ANY || kb === kind.ANY) {
    return true;
  }

  // Numbers are only compatible with numbers.
  var nA = isNumber(a);
  var nB = isNumber(b);
  if (nA || nB) {
    return nA && nB;
  }

  // Booleans are only compatible with booleans.
  if (ka === kind.BOOL || kb === kind.BOOL) {
    return ka === kind.BOOL && kb === kind.BOOL;
  }

  // Type objects are only compatible with type objects.
  if (ka === kind.TYPEOBJECT || kb === kind.TYPEOBJECT) {
    return ka === kind.TYPEOBJECT && kb === kind.TYPEOBJECT;
  }

  // Handle string, enum, []byte here. []byte is not compatible with []number
  var sA = isStringEnumBytes(a);
  var sB = isStringEnumBytes(b);
  if (sA || sB) {
    return sA && sB;
  }

  // Track composite types. Only these can be recursive.
  seenA.add(a);
  seenB.add(b);

  // Handle composites types.
  switch(ka) {
    case kind.ARRAY:
    case kind.LIST:
      switch(kb) {
        case kind.ARRAY:
        case kind.LIST:
          return compat(a.elem, b.elem, seenA, seenB);
      }
      return false;
    case kind.SET:
      switch(kb) {
        case kind.SET:
          return compat(a.key, b.key, seenA, seenB);
        case kind.MAP:
          // Note: Swap a and b. The helper needs a map first.
          return compatMapKeyElem(b, a.key, types.BOOL, seenB, seenA);
        case kind.STRUCT:
          // Note: Swap a and b. The helper needs a struct first.
          return compatStructKeyElem(b, a.key, types.BOOL, seenB, seenA);
      }
      return false;
    case kind.MAP:
      switch(kb) {
        case kind.SET:
          return compatMapKeyElem(a, b.key, types.BOOL, seenA, seenB);
        case kind.MAP:
          return compatMapKeyElem(a, b.key, b.elem, seenA, seenB);
        case kind.STRUCT:
          // Note: Swap a and b. The helper needs a struct first.
          return compatStructKeyElem(b, a.key, a.elem, seenA, seenB);
      }
      return false;
    case kind.STRUCT:
      switch(kb) {
        case kind.SET:
          return compatStructKeyElem(a, b.key, types.BOOL, seenA, seenB);
        case kind.MAP:
          return compatStructKeyElem(a, b.key, b.elem, seenB, seenA);
        case kind.STRUCT:
          // Special: empty struct is compatible to all other structs
          if (isEmptyStruct(a) || isEmptyStruct(b)) {
            return true;
          }
          return compatFields(a, b, seenA, seenB);
      }
      return false;
    case kind.UNION:
      switch (kb) {
        case kind.UNION:
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
  // Note: Use a separate copy of the ancestors-seen set for the keys.
  return compat(a.key, bKey, setCopy(seenA), setCopy(seenB)) &&
    compat(a.elem, bElem, seenA, seenB);
}

// Helper to determine if a struct and a key-elem combo are compatible.
// Requirement: a is a struct type.
// Key must be string-compatible, elem must be compatible with all struct fields
function compatStructKeyElem(a, bKey, bElem, seenA, seenB) {
  if (isEmptyStruct(a)) {
    return false; // empty struct can't convert to map/set
  }
  if (!compat(types.STRING, bKey, seenA, seenB)) {
    return false;
  }
  for (var i = 0; i < a.fields.length; i++) {
    // Note: Each field needs an independent copy of the ancestors-seen set.
    if (!compat(a.fields[i].type, bElem, setCopy(seenA), setCopy(seenB))) {
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
        // Note: Each field needs an independent copy of the ancestors-seen set.
        var typeMatch = compat(fieldA.type, fieldB.type, setCopy(seenA),
          setCopy(seenB));
        // Return false if despite a name match, the types did not match.
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

// Returns a copy of the given set.
// TODO(alexfandrianto): May be inefficient. Used to detect recursive types.
// An alternative is to use branch ids when descending down the type graph.
function setCopy(set) {
  var s = new Set();
  set.forEach(function(key) {
    s.add(key);
  });
  return s;
}

// Helper to determine if the type represents a number.
function isNumber(t) {
  switch(t.kind) {
    case kind.BYTE: // TODO(alexfandrianto): Byte is not a number.
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
      return true;
  }
  return false;
}

// Helper to determine if the type is a string, enum, or byte array/slice.
function isStringEnumBytes(t) {
  return t.kind === kind.STRING || t.kind === kind.ENUM ||
    (t.kind === kind.LIST && t.elem.kind === kind.BYTE) ||
    (t.kind === kind.ARRAY && t.elem.kind === kind.BYTE);
}

// Helper to determine if this struct is empty.
// Requirement: t is a struct.
function isEmptyStruct(t) {
  return t.fields.length === 0;
}
