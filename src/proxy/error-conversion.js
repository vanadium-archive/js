/**
 * @fileoverview conversion between JavaScript and v23/verror Error object
 * @private
 */

var VanadiumError = require('./../errors/vanadium-error');
var defaultLanguage = require('./../runtime/default-language');
var defaultCatalog = require('./../runtime/default-catalog');
var verror = require('../v.io/v23/verror');

module.exports = {
  toStandardErrorStruct: toStandardErrorStruct,
};

var unknownId = (new verror.UnknownError(null)).id;

/**
 * Converts from a JavaScript error object to verror standard struct which
 * wspr expects as error format.
 * @private
 * @param {Error} err JavaScript error object
 * @param {string} appName name of the app
 * @param {string} operation operation name.
 * @return {_standard} verror standard struct
 */
function toStandardErrorStruct(err, appName, operation) {
  if (err instanceof VanadiumError) {
    return err;
  }
  var message = '';
  var paramList = [];

  if (err instanceof Error) {
    message = err.message;

    paramList = [];
  } else if (err !== undefined && err !== null) {
    paramList = [appName, operation, err + ''];
    message = defaultCatalog.format(
      defaultLanguage, unknownId, paramList);
  }

  if (!paramList[0] && appName) {
    paramList[0] = appName;
  }

  if (!paramList[1] && operation) {
    paramList[1] = operation;
  }
  // Make a copy of paramList
  var args = paramList.slice(0);
  // Add a null context to the front of the args.
  args.unshift(null);
  var e = new verror.UnknownError(args);
  e.resetArgs.apply(e, paramList);
  e.message = message;
  e.msg = message;
  return e;
}
