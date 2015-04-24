// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Guesses the type of the given value.
 * Values can be either normal JavaScript value, or have type information
 * associated with them.
 * @private
 */

var types = require('./types.js');
var typeUtil = require('./type-util.js');
require('./es6-shim');
var nativeTypeRegistry = require('./native-type-registry');

module.exports = guessType;

/**
 * Guess the type of a value based on its contents. If _type is not present
 * this returns types.JSValue.
 * @private
 * @param {*} val The value.
 * @return {module:vanadium.vdl.Type} The guessed type for val.
 */
function guessType(val) {
  if (typeUtil.isTyped(val)) {
    return val._type;
  }

  var nativeType = nativeTypeRegistry.lookupNativeToType(val);
  if (nativeType) {
    return nativeType;
  }

  return types.JSVALUE;
}
