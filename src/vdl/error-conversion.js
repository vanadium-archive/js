var errorMap = require('./../runtime/error-map');
var VanadiumError = require('./../errors/vanadium-error');

module.exports = {
  toJSerror: toJSerror
};


/**
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
function toJSerror(verr) {
  if (verr instanceof VanadiumError) {
    return verr;
  }
  var err;

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
