/**
 * @fileoverview Defines helpers for miscellaneous operations.
 */
module.exports = {
  capitalize: capitalize,
  uncapitalize: uncapitalize,
  isCapitalized: isCapitalized,
  isExportedStructField: isExportedStructField,
  getFirstDefinedPropertyKey: getFirstDefinedPropertyKey
};

/**
 * Copies and capitalizes the first letter of the given string.
 * @param {string} s The string.
 * @return {string} copy of the string with the first letter upper-cased.
 */
function capitalize(s) {
  return s[0].toUpperCase() + s.substr(1);
}

/**
 * Copies and uncapitalizes the first letter of the given string.
 * @param {string} s The string.
 * @return {string} copy of the string with the first letter lower-cased.
 */
function uncapitalize(s) {
  return s[0].toLowerCase() + s.substr(1);
}

/**
 * Checks if the first letter of the given string is capitalized.
 * Note: Strings starting with a special character are considered capitalized.
 * @param {string} s The string.
 * @return {bool} whether or not the string is capitalized.
 */
function isCapitalized(s) {
  return s[0].toUpperCase() === s[0];
}

/**
 * Returns true if the field doesn't start with '_'.
 * @param {string} field The field label of a struct.
 * @return {bool} whether or not the field should be exported.
 */
function isExportedStructField(field) {
  return field.length > 0 && field[0] !== '_';
}

/**
 * Returns the key of the first defined property in the object.
 * If there were no keys, or all keys had field value undefined, then this
 * returns undefined.
 * @param {object} o The object
 * @return {string | undefined} The key of the first defined field in o.
 */
function getFirstDefinedPropertyKey(o) {
  var keys = Object.keys(o);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (o[key] !== undefined) {
      return key;
    }
  }
  return;
}