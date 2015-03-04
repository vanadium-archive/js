/**
 * @fileoverview Guesses the type of the given value.
 * Values can be either normal JavaScript value, or have type information
 * associated with them.
 */

var Types = require('./types.js');
var TypeUtil = require('./type-util.js');
require('./es6-shim');
var nativeTypeRegistry = require('./native-type-registry');

module.exports = guessType;

/**
 * Guess the type of a value based on its contents. If _type is not present
 * this returns Types.JSValue.
 * @param {any} val The value.
 * @return {Type} The guessed type for val.
 */
function guessType(val) {
  if (TypeUtil.isTyped(val)) {
    return val._type;
  }

  var nativeType = nativeTypeRegistry.lookupNativeToWireConverter(val);
  if (nativeType) {
    return nativeType.type;
  }

  return Types.JSVALUE;
}
