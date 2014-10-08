/**
 * @fileoverview conversion between JavaScript and veyron2/verror Error object
 */

var vError = require('./../lib/verror');

module.exports = {
  toStandardErrorStruct: toStandardErrorStruct,
  toJSerror: toJSerror
};

/*
 * Implements the same structure as Standard struct in veyron2/verror
 * @private
 * @param {Object} idAction idActionription of the error, which in JavaScript,
 * corresponds to the name property of an Error object.
 */
var _standard = function(idAction, message) {
  this.idAction = idAction;
  this.msg = message;
};

/*
 * Converts from a JavaScript error object to verror standard struct which
 * wspr expects as error format.
 * @private
 * @param {Error} err JavaScript error object
 * @return {_standard} verror standard struct
 */
function toStandardErrorStruct(err) {
  var idAction = {
    id: 'unknown',
    action: 0,
  };
  var errMessage = '';
  if (err instanceof Error) {
    errMessage = err.message;
    if (err.idAction) { // default name is considered unknown
      idAction = err.idAction;
    }
  } else if (err !== undefined && err !== null) {
    errMessage = err + '';
  }

  return new _standard(idAction, errMessage);
}

var errIdConstrMap = {};
errIdConstrMap[vError.IdActions.Aborted.id] = vError.AbortedError;
errIdConstrMap[vError.IdActions.BadArg.id] = vError.BadArgError;
errIdConstrMap[vError.IdActions.BadProtocol.id] = vError.BadProtocolError;
errIdConstrMap[vError.IdActions.Exists.id] = vError.ExistsError;
errIdConstrMap[vError.IdActions.Internal.id] = vError.InternalError;
errIdConstrMap[vError.IdActions.NoAccess.id] = vError.NoAccessError;
errIdConstrMap[vError.IdActions.NoExist.id] = vError.NoExistError;
errIdConstrMap[vError.IdActions.NoExistOrNoAccess.id] =
   vError.NoExistOrNoAccessError;

/*
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
function toJSerror(verr) {
  var err;

  var type = verr.iDAction.iD || verr.iDAction.id
  var ErrIdConstr = errIdConstrMap[type];
  var msg = verr.msg || (type + ": " + verr.paramList.join(" "));
  if(ErrIdConstr) {
    err = new ErrIdConstr(msg);
  } else {
    err = new vError.VeyronError(msg, verr.iDAction);
  }

  return err;
}
