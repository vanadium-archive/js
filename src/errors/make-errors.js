var errorMap = require('../runtime/error-map');
var inherits = require('util').inherits;
var defaultCatalog = require('../runtime/default-catalog');
var DefaultError = require('./default-error');

module.exports = makeError;
/**
 * Returns a constructor that represents the error id
 * and actionCode passed in.
 * @param {string} id The unique id for this error type.  It is preferable
 * to prefix the error name with a package path that is unique.
 * @param {number} action The retry action for this error.
 * @param {string} englishText The format for generating the error message in
 * english.
 * @returns {constructor} A constructor that can be used to create vanadium
 * errors with the given error id.
 */
function makeError(id, actionCode, englishText) {
  function Constructor(ctx, args, dontAddComponentAndOp) {
    if (!(this instanceof Constructor)) {
      return new Constructor(ctx, args);
    }
    DefaultError.call(this, id, actionCode, ctx, args, dontAddComponentAndOp);
  }
  inherits(Constructor, DefaultError);
  errorMap[id] = Constructor;
  defaultCatalog.setWithBase('en-US', id, englishText);
  return Constructor;
}
