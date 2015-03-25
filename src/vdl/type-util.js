// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Defines helpers for dealing with types.
 * @private
 */

var Kind = require('./kind.js');

module.exports = {
  shouldSendLength: shouldSendLength,
  unwrap: unwrap,
  unwrapNonDefault: unwrapNonDefault,
  recursiveUnwrap: recursiveUnwrap,
  isTyped: isTyped,
  isWrapped: isWrapped,
  constructorOf: constructorOf
};

/**
 * Determines if the length should be sent in the header of a value message of
 * the specified type.
 * @private
 * @param {Type} type The type.
 * @return {boolean} true if the length should be sent in the header of the
 * the value message or false otherwise.
 */
function shouldSendLength(type) {
  if (type.kind === Kind.ARRAY || type.kind === Kind.LIST) {
    return type.elem.kind !== Kind.BYTE;
  }
  switch (type.kind) {
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
    case Kind.SET:
    case Kind.MAP:
    case Kind.STRUCT:
    case Kind.ANY:
    case Kind.UNION:
    case Kind.OPTIONAL:
      return true;
    default:
      return false;
  }
}

function _isObject(v) {
  return (typeof v === 'object' && v !== null);
}

/**
 * Checks whether the given value is a typed value.
 * @private
 * @param {any} v The potentially typed value.
 * @return {boolean} whether the value has a type attached or not.
 */
function isTyped(v) {
  return _isObject(v) && _isObject(v._type);
}

/**
 * Checks whether the given value is a wrapped value.
 * @private
 * @param {VomValue} v The potentially wrapped value.
 * @return {boolean} whether the value was wrapped or not.
 */
function isWrapped(v) {
  return (isTyped(v) && v._wrappedType === true);
}

/**
 * Unwrap the value in a potentially wrapped type.
 * Note: The convention is to only wrap types once, not deeply.
 * @private
 * @param {VomValue} v The value to be unwrapped.
 * @return {any} the unwrapped value.
 */
function unwrap(v) {
  if (isWrapped(v)) {
    v = v.val;
  }
  return v;
}

/**
 * Obtain the constructor (if available) of the given value.
 * The constructor can be a WrappedConstructor, StructConstructor, or Type.
 * TODO(alexfandrianto): This will be removed; canonicalize will instead use the
 * registry to lookup the constructor, instead of relying on this.
 * @private
 * @param {VomValue} v The value to be unwrapped.
 * @return {Constructor?} a constructor if v is wrapped, null otherwise.
 */
function constructorOf(v) {
  if (isWrapped(v)) {
    return v.constructor;         // WrappedConstructor
  } else if (_isObject(v) && _isObject(v._type)) {
    return v.constructor || null; // StructConstructor, TypeConstructor, or null
  }
  return null;
}

/**
 * Unwrap the value if the unwrapped type will be guessed on encode.
 * @private
 * @param {VomValue} v The value to be unwrapped.
 * @return {any} the unwrapped value.
 */
function unwrapNonDefault(v) {
  // TODO(bprosnitz) This function doesn't match the default guess rules.
  // Update this to do more than just check for the name field.
  if (isWrapped(v) && !v._type.hasOwnProperty('name')) {
    return unwrap(v);
  }
  return v;
}

// recursively descent the object and unwrap the value.
function recursiveUnwrap(val) {
  if (typeof val !== 'object' || val === null) {
    return val;
  }

  var lastVal;
  while (lastVal !== val) {
    lastVal = val;
    val = unwrap(val);
  }

  if (val instanceof Map) {
    var replacementMap = new Map();
    val.forEach(function(value, key) {
      var unwrappedKey = recursiveUnwrap(key);
      var unwrappedValue = recursiveUnwrap(value);
      replacementMap.set(unwrappedKey, unwrappedValue);
    });
    return replacementMap;
  }

  if (val instanceof Set) {
    var replacementSet = new Set();
    val.forEach(function(key) {
      var unwrappedKey = recursiveUnwrap(key);
      replacementSet.add(unwrappedKey);
    });
    return replacementSet;
  }

  for (var key in val) {
    if (val.hasOwnProperty(key)) {
      val[key] = recursiveUnwrap(val[key]);
    }
  }
  return val;
}
