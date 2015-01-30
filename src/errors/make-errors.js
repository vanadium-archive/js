var errorMap = require('../runtime/error-map');
var inherits = require('util').inherits;
var defaultCatalog = require('../runtime/default-catalog');
var VanadiumError = require('./vanadium-error');

module.exports = makeError;
/**
 * Returns a constructor that represents the error id
 * and actionCode passed in.
 * @param {string} id The unique id for this error type.  It is preferable
 * to prefix the error name with a package path that is unique.
 * @param {number} action The retry action for this error.
 * @param {string|object} format If a string, then it's the en-US text string,
 * otherwise it is a map from languageId to format string.
 * @param {Array} types The array of types that expected for the arguments to
 * the error constructor.
 * @returns {constructor} A constructor that can be used to create vanadium
 * errors with the given error id.
 */
function makeError(id, actionCode, format, types) {
  var fname = id.split('.').pop();
  var Errors = {};
  Errors[fname] = function () {
    var args = Array.prototype.slice.call(arguments);
    if (Array.isArray(args[0]) && args.length === 1) {
      args = args[0];
    }
    if (!(this instanceof Errors[fname])) {
      return new Errors[fname](args);
    }
    args.unshift(actionCode);
    args.unshift(id);
    VanadiumError.apply(this, args);
  };
  inherits(Errors[fname], VanadiumError);
  Errors[fname].prototype._argTypes = types || [];
  errorMap[id] = Errors[fname];
  if (typeof format === 'string') {
    format = { 'en-US': format };
  }

  if (format) {
    var keys = Object.keys(format);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      defaultCatalog.setWithBase(key, id, format[key]);
    }
  }
  return Errors[fname];
}
