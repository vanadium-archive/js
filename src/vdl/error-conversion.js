var errorMap = require('./../runtime/error-map');
var VanadiumError = require('./../errors/vanadium-error');
var defaultLanguage = require('./../runtime/default-language');
var defaultCatalog = require('./../runtime/default-catalog');
var unwrap = require('./type-util').unwrap;
var verror = require('../v.io/v23/verror');


module.exports = {
  fromWireType: fromWireType,
  fromNativeType: fromNativeType,
};



var unknown = (new verror.UnknownError(null));

/**
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
function fromWireType(verr) {
  // We have to unwrap verr, because it could either be of type Types.ERROR
  // or Types.ERROR.elem The first type is an optional version of the
  // second type.
  verr = unwrap(verr);
  if (verr instanceof VanadiumError) {
    return verr;
  }
  var err;

  if (!verr) {
    return null;
  }
  var id = verr.id;
  var retry = verr.retryCode;
  var msg = verr.msg;
  verr.paramList = verr.paramList || [];

  var Ctor = errorMap[id];


  if (Ctor) {
    // First parameter to all error constructors is the context, which
    // in this case is null.  In this case, we don't need a context
    // since everything we need from the context should already be in
    // the wire protocol.
    err = new Ctor([null].concat(verr.paramList));
  } else {
    // The required args to VanadiumError are:
    // errorId, retry, context
    // Any remaining parameters are considered the param list.
    var args = [id, retry, null].concat(verr.paramList);
    err = new VanadiumError(args);
  }

  err.resetArgs.apply(err, verr.paramList);
  if (msg !== '') {
    err.message = msg;
  }

  return err;
}

/**
 * Converts from a JavaScript error object to verror standard struct which
 * wspr expects as error format.
 * @private
 * @param {Error} err JavaScript error object
 * @param {string} appName name of the app
 * @param {string} operation operation name.
 * @return {_standard} verror standard struct
 */
function fromNativeType(err, appName, operation) {
  if (err instanceof VanadiumError) {
    return err;
  }

  if (!err) {
    return null;
  }
  var message = '';
  var paramList = [];

  if (err instanceof Error) {
    message = err.message;

    paramList = [];
  } else if (err !== undefined && err !== null) {
    paramList = [appName, operation, err + ''];
    message = defaultCatalog.format(
      defaultLanguage, unknown.id, paramList);
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


