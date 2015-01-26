var makeError = require('./make-errors');
var actions = require('./actions');

var goPkg = 'v.io/core/veyron2/verror.';
function makeNoRetryError(suffix, english) {
  return makeError(goPkg + suffix, actions.NO_RETRY, english);
}

/**
 * An unknown error.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.UnknownError = makeNoRetryError(
  'Unknown', '{1:}{2:} Error{:_}');
/**
 * An internal error.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.InternalError = makeNoRetryError(
  'Internal', '{1:}{2:} Internal error{:_}');

/**
 * An end of file error.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.EOFError = makeNoRetryError('EOF', '{1:}{2:} EOF{:_}');

/**
 * An error that means that a bad argument was passed in.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.BadArgError = makeNoRetryError(
  'BadArg', '{1:}{2:} Bad argument{:_}');

/**
 * An error that means that the object is in a bad state.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.BadStateError =
  makeNoRetryError('BadState', '{1:}{2:} Invalid State{:_}');

/**
 * An error that means that the object/server already exists.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.ExistError = makeNoRetryError(
  'Exist', '{1:}{2:} Already exists{:_}');

/**
 * An error that means that the object/server does not exist.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.NoExistError = makeNoRetryError(
  'NoExist', '{1:}{2:} Does not exist{:_}');

/**
 * An error that means that either the object/server does not exist
 * or that there was an authorization error.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.NoExistOrNoAccessError = makeNoRetryError(
  'NoExistOrNoAccess', '{1:}{2:} Does not exist or access denied{:_}');

function makeRetryRefetchError(suffix, english) {
  return makeError(goPkg + suffix, actions.RETRY_REFETCH, english);
}

/**
 * An error that means that there were no usable servers were found
 * for a given name.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.NoServersError = makeRetryRefetchError(
  'NoServers', '{1:}{2:} No usable servers found{:_}');

/**
 * An error that means that authorization failed.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.NoAccessError =
  makeNoRetryError('NoAccess', '{1:}{2:} Access denied{:_}');

/**
 * An error that means that the client did not trust the server.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.NotTrustedError = makeRetryRefetchError(
  'NotTrusted', '{1:}{2:} Client does not trust server{:_}');

/**
 * An error that means that either there was no usable server or authorization
 * failed for the name passed in.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.NoServersAndAuthError =
  makeNoRetryError('NoServersAndAuth',
                   '{1:}{2:} Has no usable servers and is either not trusted' +
                   'or access was denied{:_}');

/**
 * An error that means that an RPC was aborted.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.AbortedError = makeNoRetryError(
  'Aborted', '{1:}{2:} Aborted{:_}');

/**
 * An error that means there was a protocol mismatch between client
 * and server.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.BadProtocolError = makeNoRetryError(
  'BadProtocol', '{1:}{2:} Bad protocol or type{:_}');

/**
 * An error that means that the RPC timed out.
 * @constructor
 * @param {Context} ctx The context that the error occured in.
 * @param {Array} args The list of args for the error message.
 */
module.exports.TimeoutError = makeNoRetryError(
  'Timeout', '{1:}{2:} Timeout{:_}');
