/**
 * @fileoverview built-in Veyron errors
 */

var inherits = require('util').inherits;

var vError = {};

/*
 * List of predefined error ids. Matches veyron2/vError/common.idl
 */
vError.Ids = {
  Aborted: 'veyron.io/veyron/veyron2/verror.Aborted',
  BadArg: 'veyron.io/veyron/veyron2/verror.BadArg',
  BadProtocol: 'veyron.io/veyron/veyron2/verror.BadProtocol',
  Exists: 'veyron.io/veyron/veyron2/verror.Exists',
  Internal: 'veyron.io/veyron/veyron2/verror.Internal',
  NoAccess: 'veyron.io/veyron/veyron2/verror.NoAccess',
  NoExist: 'veyron.io/veyron/veyron2/verror.NoExist',
  NoExistOrNoAccess: 'veyron.io/veyron/veyron2/verror.NoExistOrNoAccess'
};

/*
 * Creates an error object given the ID as the name and a message
 * @constructor
 * @param {string} message message
 * @param {vError.Ids} id Error id
 */
vError.VeyronError = function(message, id) {
  if (!(this instanceof vError.VeyronError)) {
    return new vError.VeyronError(message, id);
  }
  Error.call(this);
  this.message = message;
  if (id) {
    this.name = id;
  }
  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, vError.VeyronError);
  } else {
    this.stack = (new Error()).stack;
  }
};
inherits(vError.VeyronError, Error);

/*
 * Tests if two errors are equal.
 * If the errors are both VeyronErrors then this returns true
 * when their messange and names are equal.  Other cases return false.
 * @param {Error} a An error to compare
 * @param {Error} a An error to compare
 * @return {boolean} Returns true if the errors are equal.
 */
vError.equals = function(a, b) {
  var ais = a instanceof vError.VeyronError;
  var bis = b instanceof vError.VeyronError;
  if (ais && bis) {
    return a.message === b.message && a.id === b.id;
  }
  return false;
};

/*
 * Creates an error object indicating operation aborted, e.g. connection closed.
 * @constructor
 * @param {string} message message
 */
vError.AbortedError = function(message) {
  if (!(this instanceof vError.AbortedError)) {
    return new vError.AbortedError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.Aborted);
};
inherits(vError.AbortedError, vError.VeyronError);

/*
 * Creates an error object indicating requester specified an invalid argument.
 * @constructor
 * @param {string} message message
 * @return {Error} Error object with name set to the badarg error id.
 */
vError.BadArgError = function(message) {
  if (!(this instanceof vError.BadArgError)) {
    return new vError.BadArgError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.BadArg);
};
inherits(vError.BadArgError, vError.VeyronError);

/*
 * Creates an error object indicating protocol mismatch,
 * including type or argument errors.
 * @param {string} message message
 * @return {Error} Error object with name set to the bad protocol error id.
 */
vError.BadProtocolError = function(message) {
  if (!(this instanceof vError.BadProtocolError)) {
    return new vError.BadProtocolError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.BadProtocol);
};
inherits(vError.BadProtocolError, vError.VeyronError);

/*
 * Creates an error object indicating requested entity already exists
 * @param {string} message message
 * @return {Error} Error object with name set to the exists error id.
 */
vError.ExistsError = function(message) {
  if (!(this instanceof vError.ExistsError)) {
    return new vError.ExistsError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.Exists);
};
inherits(vError.ExistsError, vError.VeyronError);

/*
 * Creates an error object indicating internal invariants broken;
 * something is very wrong
 * @param {string} message message
 * @return {Error} Error object with name set to the internal error id.
 */
vError.InternalError = function(message) {
  if (!(this instanceof vError.InternalError)) {
    return new vError.InternalError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.Internal);
};
inherits(vError.InternalError, vError.VeyronError);

/*
 * Creates an error object indicating requester isn't authorized
 * to access the entity.
 * @param {string} message message
 * @return {Error} Error object with name set to the not authorized error id.
 */
vError.NoAccessError = function(message) {
  if (!(this instanceof vError.NoAccessError)) {
    return new vError.NoAccessError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.NoAccess);
};
inherits(vError.NoAccessError, vError.VeyronError);

/*
 * Creates an Error object indicating requested entity (e.g. object, method)
 * does not exist.
 * @param {string} message message
 * @return {Error} Error object with name set to the not found error id.
 */
vError.NoExistError = function(message) {
  if (!(this instanceof vError.NoExistError)) {
    return new vError.NoExistError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.NoExist);
};
inherits(vError.NoExistError, vError.VeyronError);

/*
 * Creates an Error object indicating requested entity (e.g. object, method)
 * either does not exist, or that the requester is not authorized to access it.
 * @param {string} message message
 * @return {Error} Error object with name set to the not found error id.
 */
vError.NoExistOrNoAccessError = function(message) {
  if (!(this instanceof vError.NoExistOrNoAccessError)) {
    return new vError.NoExistOrNoAccessError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.NoExistOrNoAccess);
};
inherits(vError.NoExistOrNoAccessError, vError.VeyronError);
module.exports = vError;
