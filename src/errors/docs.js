/*
 * This has the docs for all the generated vdl errors.  Ideally this would be
 * generated by the compiler, but right now the vdl file does not have enough
 * info to generate linked docs.  Instead this is hand generated and needed
 * to be kept up to date with the vdl file.
 */
/**
 * UnknownError with no error id.  This should rarely be used, and should
 * only be generated when converting from native errors to VanadiumError
 * @name UnknownError
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * InternalError represent an internal error.  Like UnknownErrors more specific
 * errors should be used when possible.
 * @name InternalError
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * NotImplementedError means that the remote end does implement the method
 * that was called.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NotImplementedError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * EOFError means that the end of file has been reached.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name EOFError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * BadArgError means that the arguments to an operation are invalid.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name BadArgError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * BadEtagError means that the etag presented by the client was out of date or
 * otherwise invalid, likely because another request caused the etag on the
 * server to change.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name BadEtagError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * ExistError means that the requested item already exists; typically returned
 * when an attempt to create an iteam fails because the item already exists.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name ExistError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * NoExistError means that the requested item does not exist.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NoExistError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * NoExistOrNoAccessError means that the requested item does not exist or
 * that is inaccessible; typically returned when the distinction between
 * existence and inaccessibility need to be hidden for privacy reasons.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NoExistOrNoAccessError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * NoServersError means that the servers returned for a given name are
 * unreachable or unusable by the client.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NoServersError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * NotTrustedError means that the client does not trust the server.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NotTrustedError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * NoAccessError means that the server doesn't authorize the client.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NotAccessError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * NoServersAndAuth means that either there were no usable servers, the client
 * didn't trust the server, or the server didn't authorize the client;
 * typically returned if the distinction between the three different error
 * cases need to be hidden for privacy reason.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NoServersAndAuthError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * AbortedError means that the operation was aborted.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name AbortedError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * BadProtocolError means the operation failed because of a protocol or codec
 * error.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name BadProtocolError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * CanceledError means the operation was not completed because it was
 * explicitly cancelled by the caller.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name CanceledError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
/**
 * TimeoutError means that the operation timed out.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name TimeoutError
 * @constructor
 * @memberof module:vanadium.errors
 * @augments module.vanadium.errors.VanadiumError
 */
