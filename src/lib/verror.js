/**
 * @fileoverview built-in Veyron errors
 */

var inherits = require('util').inherits;

var verror = {};

verror.Actions = {
  NoRetry: 0,
  RetryConnection: 1,
  RetryRefetch: 2,
  RetryBackoff: 3,
};

/*
 * List of predefined error ids. Matches veyron2/verror/common.idl
 */
verror.IdActions = {
  Aborted: {
    id: 'v.io/veyron/veyron2/verror.Aborted',
    action: verror.Actions.NoRetry,
  },
  BadArg: {
    id: 'v.io/veyron/veyron2/verror.BadArg',
    action: verror.Actions.NoRetry,
  },
  BadProtocol: {
    id: 'v.io/veyron/veyron2/verror.BadProtocol',
    action: verror.Actions.NoRetry,
  },
  Exists: {
    id: 'v.io/veyron/veyron2/verror.Exists',
    action: verror.Actions.NoRetry,
  },
  Internal: {
    id: 'v.io/veyron/veyron2/verror.Internal',
    action: verror.Actions.NoRetry,
  },
  NoAccess: {
    id: 'v.io/veyron/veyron2/verror.NoAccess',
    action: verror.Actions.NoRetry,
  },
  NoExist: {
    id: 'v.io/veyron/veyron2/verror.NoExist',
    action: verror.Actions.NoRetry,
  },
  NoServers: {
    id: 'v.io/veyron/veyron2/verror.NoServers',
    action: verror.Actions.RetryRefetch,
  },
  NoExistOrNoAccess: {
    id: 'v.io/veyron/veyron2/verror.NoExistOrNoAccess',
    action: verror.Actions.NoRetry,
  },
  Unknown: {
    id: 'v.io/veyron/veyron2/verror.Unknown',
    action: verror.Actions.NoRetry,
  }
};

/*
 * Creates an error object given the ID as the name and a message
 * @constructor
 * @param {string} message message
 * @param {verror.IdActions} idAction idActionription of error
 */
verror.VeyronError = function(message, idAction) {
  if (!(this instanceof verror.VeyronError)) {
    return new verror.VeyronError(message, idAction);
  }

  Error.call(this);

  this.message = message || '';

  this.idAction = idAction || verror.IdActions.Unknown;

  if (! this.idAction.id) {
    this.idAction.id = verror.IdActions.Unknown.id;
  }

  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, verror.VeyronError);
  } else {
    this.stack = (new Error()).stack;
  }
};

inherits(verror.VeyronError, Error);

/*
 * Creates an error object indicating operation aborted, e.g. connection closed.
 * @constructor
 * @param {string} message message
 */
verror.AbortedError = function(message) {
  if (!(this instanceof verror.AbortedError)) {
    return new verror.AbortedError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.Aborted);
};
inherits(verror.AbortedError, verror.VeyronError);

/*
 * Creates an error object indicating requester specified an invalid argument.
 * @constructor
 * @param {string} message message
 * @return {Error} Error object with name set to the badarg error id.
 */
verror.BadArgError = function(message) {
  if (!(this instanceof verror.BadArgError)) {
    return new verror.BadArgError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.BadArg);
};
inherits(verror.BadArgError, verror.VeyronError);

/*
 * Creates an error object indicating protocol mismatch,
 * including type or argument errors.
 * @param {string} message message
 * @return {Error} Error object with name set to the bad protocol error id.
 */
verror.BadProtocolError = function(message) {
  if (!(this instanceof verror.BadProtocolError)) {
    return new verror.BadProtocolError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.BadProtocol);
};
inherits(verror.BadProtocolError, verror.VeyronError);

/*
 * Creates an error object indicating requested entity already exists
 * @param {string} message message
 * @return {Error} Error object with name set to the exists error id.
 */
verror.ExistsError = function(message) {
  if (!(this instanceof verror.ExistsError)) {
    return new verror.ExistsError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.Exists);
};
inherits(verror.ExistsError, verror.VeyronError);

/*
 * Creates an error object indicating internal invariants broken;
 * something is very wrong
 * @param {string} message message
 * @return {Error} Error object with name set to the internal error id.
 */
verror.InternalError = function(message) {
  if (!(this instanceof verror.InternalError)) {
    return new verror.InternalError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.Internal);
};
inherits(verror.InternalError, verror.VeyronError);

/*
 * Creates an error object indicating requester isn't authorized
 * to access the entity.
 * @param {string} message message
 * @return {Error} Error object with name set to the not authorized error id.
 */
verror.NoAccessError = function(message) {
  if (!(this instanceof verror.NoAccessError)) {
    return new verror.NoAccessError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.NoAccess);
};
inherits(verror.NoAccessError, verror.VeyronError);

/*
 * Creates an Error object indicating requested entity (e.g. object, method)
 * does not exist.
 * @param {string} message message
 * @return {Error} Error object with name set to the not found error id.
 */
verror.NoExistError = function(message) {
  if (!(this instanceof verror.NoExistError)) {
    return new verror.NoExistError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.NoExist);
};
inherits(verror.NoExistError, verror.VeyronError);

/*
 * Creates an Error object indicating requested entity (e.g. object, method)
 * had no servers assigned to it.
 * @param {string} message message
 * @return {Error} Error object with name set to the not found error id.
 */
verror.NoServersError = function(message) {
  if (!(this instanceof verror.NoServersError)) {
    return new verror.NoServersError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.NoServers);
};
inherits(verror.NoServersError, verror.VeyronError);

/*
 * Creates an Error object indicating requested entity (e.g. object, method)
 * either does not exist, or that the requester is not authorized to access it.
 * @param {string} message message
 * @return {Error} Error object with name set to the not found error id.
 */
verror.NoExistOrNoAccessError = function(message) {
  if (!(this instanceof verror.NoExistOrNoAccessError)) {
    return new verror.NoExistOrNoAccessError(message);
  }
  verror.VeyronError.call(this, message, verror.IdActions.NoExistOrNoAccess);
};
inherits(verror.NoExistOrNoAccessError, verror.VeyronError);

verror.UnknownError = function(message) {
  if (!(this instanceof verror.UnknownError)) {
    return new verror.UnknownError(message);
  }

  verror.VeyronError.call(this, message);
};

inherits(verror.UnknownError, verror.VeyronError);

module.exports = verror;
