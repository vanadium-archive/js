// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = {
  fromNativeValue: fromNativeValue,
  fromWireValue: fromWireValue,
  registerFromNativeValue: registerFromNativeValue,
  registerFromWireValue: registerFromWireValue,
  hasNativeType: hasNativeType,
  isNative: isNative,
  lookupNativeToType: lookupNativeToType
};

require('./es6-shim');

// A map from vdl type string to a function that produces
// a wire type from the vdl value.
var nativeToWire = {};

// A map from native constructor to vdl type string.
// Used to determine the type of a native value.
var nativeToType = new Map();

// A map from vdl type string to a function that produces
// a native type from the vdl value.
var wireToNative = {};

/**
 * Registers a converter that converts from wire type to native type.
 * @private
 * @param {Value} t The type to convert from
 * @param {function} f A function that takes in a wire type representation
 * and returns the native type for it.
 */
function registerFromWireValue(t, f) {
  wireToNative[t.toString()] = f;
}

/**
 * Registers a converter that converts from native type to wire type.
 * @private
 * @param {function} constructor The constructor for the native object.
 * @param {function} f A function that takes in a native object and returns
 * the wire type representation of it.
 * @param {Type} type The wiretype fo the native value.
 */
function registerFromNativeValue(constructor, f, t) {
  nativeToWire[t.toString()] = f;
  nativeToType.set(constructor, t);
}

/**
 * Converts v from native type to the wire type format.
 * @private
 * @param {function} v The value to convert
 * @returns {object} The wiretype respresentation of the object.  If
 * no conversion happened, v is returned.
 */
function fromNativeValue(t, v) {
  var transform = nativeToWire[t.toString()];
  if (transform) {
    return transform(v);
  }
  return v;
}

function lookupNativeToType(v) {
  var result = null;
  nativeToType.forEach(function(wire, native) {
    if (result === null && v instanceof native) {
      result = wire;
    }
  });
  return result;
}

/**
 * Converts v from wire type to native type.
 * @private
 * @param {Value} t The type of v
 * @param {function} v The value to convert
 * @returns {object} The native object that is equivalent to v.  If
 * no conversion happened, v is returned.
 */
function fromWireValue(t, v) {
  try {
    var transform = wireToNative[t.toString()];
    if (transform) {
      return transform(v);
    }
    return v;
  } catch (e) {
    throw e;
  }
}

/**
 * Returns whether this Type has a native converter registered
 * @private
 * @param {Value} t The type
 * @returns {boolean} True iff there is native converter for this type.
 */
function hasNativeType(t) {
  return !!wireToNative[t.toString()];
}

/**
 * Returns whether this value has a wiretype converter registered
 * @private
 * @param {*} v The object to check.
 * @returns {boolean} True iff there is wiretype converter for this
 * object.
 */
function isNative(v) {
  if (v === undefined || v === null) {
    return false;
  }
  return !!lookupNativeToType(v);
}
