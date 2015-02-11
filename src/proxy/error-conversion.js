/**
 * @fileoverview conversion between JavaScript and veyron2/verror Error object
 * @private
 */

var actions = require('./../errors/actions');
var errorMap = require('./../runtime/error-map');
var VanadiumError = require('./../errors/vanadium-error');
var defaultLanguage = require('./../runtime/default-language');
var defaultCatalog = require('./../runtime/default-catalog');
var context = require('./../runtime/context');
var verror = require('../v.io/core/veyron2/verror/verror');

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
var _standard = function(idAction, message, paramList) {
  this.idAction = idAction;
  this.msg = message;
  this.paramList = paramList;
};

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
  var idAction = {
    id: 'v.io/core/veyron2/verror.Unknown',
    action: actions.NO_RETRY
  };
  var message = '';
  var paramList = [];

  if (err instanceof Error) {
    message = err.message;

    if (err.idAction) {
      idAction = err.idAction;
    }
    paramList = err.paramList || [];
  } else if (err !== undefined && err !== null) {
    paramList = [appName, operation, err + ''];
    message = defaultCatalog.format(defaultLanguage, idAction.id, paramList);
  }

  if (!paramList[0] && appName) {
    paramList[0] = appName;
  }

  if (!paramList[1] && operation) {
    paramList[1] = operation;
  }
  return new _standard(idAction, message, paramList);
}

/**
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
function toJSerror(verr, ctx) {
  var err;

  // iDAction from GO, idAction from JS
  var idAction = verr.iDAction || verr.idAction;
  var id = idAction.iD || idAction.id || '';
  var msg = verr.msg;
  verr.paramList = verr.paramList || [];

  var Ctor = errorMap[id];

  if (id === '' && !Ctor) {
    Ctor = verror.UnknownError;
  }


  if (!ctx) {
    // TODO(bjornick): Remove this after context is everywhere.
    ctx = new context.Context();
  }
  if (Ctor) {
    err = new Ctor([ctx].concat(verr.paramList));
  } else {
    var args = [id, idAction.action || actions.NO_RETRY, ctx].concat(
      verr.paramList);
    err = new VanadiumError(args);
  }

  err.resetArgs.apply(err, verr.paramList);
  if (msg !== '') {
    err.message = msg;
  }

  return err;
}
