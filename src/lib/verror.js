/**
 * @fileoverview built-in Veyron errors
 */

'use strict';

var inherits = require('./inherits');

var vError = {};

/*
 * List of predefined error ids. Matches veyron2/vError/common.idl
 */
vError.Ids = {
  Aborted: 'veyron2/verror.Aborted',
  BadArg: 'veyron2/verror.BadArg',
  BadProtocol: 'veyron2/verror.BadProtocol',
  Exists: 'veyron2/verror.Exists',
  Internal: 'veyron2/verror.Internal',
  NotAuthorized: 'veyron2/verror.NotAuthorized',
  NotFound: 'veyron2/verror.NotFound'
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
vError.NotAuthorizedError = function(message) {
  if (!(this instanceof vError.NotAuthorizedError)) {
    return new vError.NotAuthorizedError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.NotAuthorized);
};
inherits(vError.NotAuthorizedError, vError.VeyronError);

/*
 * Creates an Error object indicating requested entity (e.g. object, method)
 * not found
 * @param {string} message message
 * @return {Error} Error object with name set to the not found error id.
 */
vError.NotFoundError = function(message) {
  if (!(this instanceof vError.NotFoundError)) {
    return new vError.NotFoundError(message);
  }
  vError.VeyronError.call(this, message, vError.Ids.NotFound);
};
inherits(vError.NotFoundError, vError.VeyronError);

module.exports = vError;
