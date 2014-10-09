/**
 * @fileoverview built-in Veyron errors
 */

var inherits = require('util').inherits;

var vError = {};

vError.Actions = {
  NoRetry: 0,
  RetryConnection: 1,
  RetryRefetch: 2,
  RetryBackoff: 3,
};
/*
 * List of predefined error ids. Matches veyron2/vError/common.idl
 */
vError.IdActions = {
  Aborted: {
    id: 'veyron.io/veyron/veyron2/verror.Aborted',
    action: vError.Actions.NoRetry,
  },
  BadArg: {
    id: 'veyron.io/veyron/veyron2/verror.BadArg',
    action: vError.Actions.NoRetry,
  },
  BadProtocol: {
    id: 'veyron.io/veyron/veyron2/verror.BadProtocol',
    action: vError.Actions.NoRetry,
  },
  Exists: {
    id: 'veyron.io/veyron/veyron2/verror.Exists',
    action: vError.Actions.NoRetry,
  },
  Internal: {
    id: 'veyron.io/veyron/veyron2/verror.Internal',
    action: vError.Actions.NoRetry,
  },
  NoAccess: {
    id: 'veyron.io/veyron/veyron2/verror.NoAccess',
    action: vError.Actions.NoRetry,
  },
  NoExist: {
    id: 'veyron.io/veyron/veyron2/verror.NoExist',
    action: vError.Actions.NoRetry,
  },
  NoExistOrNoAccess: {
    id: 'veyron.io/veyron/veyron2/verror.NoExistOrNoAccess',
    action: vError.Actions.NoRetry,
  },
};

/*
 * Creates an error object given the ID as the name and a message
 * @constructor
 * @param {string} message message
 * @param {vError.IdActions} idAction idActionription of error
 */
vError.VeyronError = function(message, idAction) {
  if (!(this instanceof vError.VeyronError)) {
    return new vError.VeyronError(message, idAction);
  }
  Error.call(this);
  this.message = message;
  this.idAction = idAction;
  if (idAction.id) {
    this.name = idAction.id;
  } else if (idAction.iD) {
    this.name = idAction.iD;
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
  vError.VeyronError.call(this, message, vError.IdActions.Aborted);
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
  vError.VeyronError.call(this, message, vError.IdActions.BadArg);
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
  vError.VeyronError.call(this, message, vError.IdActions.BadProtocol);
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
  vError.VeyronError.call(this, message, vError.IdActions.Exists);
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
  vError.VeyronError.call(this, message, vError.IdActions.Internal);
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
  vError.VeyronError.call(this, message, vError.IdActions.NoAccess);
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
  vError.VeyronError.call(this, message, vError.IdActions.NoExist);
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
  vError.VeyronError.call(this, message, vError.IdActions.NoExistOrNoAccess);
};
inherits(vError.NoExistOrNoAccessError, vError.VeyronError);
module.exports = vError;
