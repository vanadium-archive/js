// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * This has the docs for all the generated vdl errors.  Ideally this would be
 * generated by the compiler, but right now the vdl file does not have enough
 * info to generate linked docs.  Instead this is hand generated and needed
 * to be kept up to date with the vdl file.
 */
/**
 * @summary
 * UnknownError means the error has no known Id.
 * @description
 * A more specific error should
 * always be used, if possible.  Unknown is typically only used when
 * automatically converting errors that do not contain an Id.
 * @name UnknownError
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * InternalError means an internal error has occurred.
 * @description
 * A more specific error
 * should always be used, if possible.
 * @name InternalError
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * NotImplementedError means that the request type is valid but that the method
 * to handle the request has not been implemented.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NotImplementedError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * EndOfFileError means the end-of-file has been reached; more generally, no
 * more input data is available.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name EndOfFileError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * BadArgError means the arguments to an operation are invalid or incorrectly
 * formatted.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name BadArgError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * BadStateError means an operation was attempted on an object while the object
 * was in an incompatible state.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name BadStateError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * BadVersion means the version presented by the client was was
 * out of date or otherwise invalid.
 * @description
 * The version presented by the client (e.g. to a service
 * that supports content-hash-based caching or atomic read-modify-write) could
 * be out of date or otherwise invalid, likely because some other request caused
 * the version at the server to change. The client should get a fresh version
 * and try again.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name BadVersionError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * ExistError means that the requested item already exists.
 * @description
 * Typically returned
 * when an attempt to create an item fails because it already exists.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name ExistError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * NoExistError means that the requested item does not exist.
 * @description
 * Typically returned
 * when an attempt to lookup an item fails because it does not exist.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NoExistError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * NoExistOrNoAccessError means that either the requested item does not exist,
 * or is inaccessible.
 * @description
 * Typically returned when the distinction between
 * existence and inaccessiblity should be hidden to preserve privacy.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NoExistOrNoAccessError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * NoServersError means a name was resolved to unusable or inaccessible servers.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NoServersError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * NoAccessError means the server does not authorize the client for access.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NotAccessError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * NotTrustedError means the client does not trust the server.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name NotTrustedError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * AbortedError means that an operation was not completed because it was aborted
 * by the receiver.
 * @description
 * A more specific error should be used if it would help the
 * caller decide how to proceed.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name AbortedError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * BadProtocolError means that an operation was not completed because of a
 * protocol or codec error.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name BadProtocolError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * CanceledError means the operation was not completed because it was explicitly
 * cancelled by the caller.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name CanceledError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * TimeoutError means that an operation was not completed before the time
 * deadline for the operation.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @name TimeoutError
 * @constructor
 * @memberof module:vanadium.verror
 * @augments module:vanadium.verror.VanadiumError
 */
