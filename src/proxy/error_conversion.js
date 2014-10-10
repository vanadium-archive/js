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
  var idAction = vError.IdActions.Unknown;
  var message = '';

  if (err instanceof Error) {
    message = err.message;

    if (err.idAction) {
      idAction = err.idAction;
    }
  } else if (err !== undefined && err !== null) {
    // coerce to string
    message = err + '';
  }

  return new _standard(idAction, message);
}

// TODO(jasoncampbell): Change this so that the error map is easier to
// lookup constructors etc.
var errors = {};

Object.keys(vError.IdActions).forEach(function(key) {
  var value = vError.IdActions[key];
  var ctor = vError[key + 'Error'];

  errors[value.id] = ctor;
});

/*
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
function toJSerror(verr) {
  var err;

  // iDAction from GO, idAction from JS
  var idAction = verr.iDAction || verr.idAction;
  var id = idAction.iD || idAction.id;
  var msg = verr.msg || (id + ': ' + verr.paramList.join(' '));

  var Ctor = errors[id];

  if (Ctor) {
    err = new Ctor(msg);
  } else {
    err = new vError.VeyronError(msg, idAction);
  }

  return err;
}
