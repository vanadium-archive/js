/**
 * GlobMaxRecursionReached indicates that the Glob
 * request exceeded the max recursion level
 * @name GlobMaxRecursionReached
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.rpc.reserved
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * GlobMatchesOmitted indicates that some of the Glob results might
 * have been omitted due to access restrictions.
 * @name GlobMatchesOmitted
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.rpc.reserved
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * GlobNotImplemented indicates that Glob is not implemented by the object.
 * @name GlobNotImplemented
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.rpc.reserved
 * @augments module:vanadium.errors.VanadiumError
 */