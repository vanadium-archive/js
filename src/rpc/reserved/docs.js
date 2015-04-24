// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary
 * GlobMaxRecursionReached indicates that the Glob
 * request exceeded the max recursion level.
 * @name GlobMaxRecursionReached
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.rpc.reserved
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * GlobMatchesOmitted indicates that some of the Glob results might
 * have been omitted due to access restrictions.
 * @name GlobMatchesOmitted
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.rpc.reserved
 * @augments module:vanadium.verror.VanadiumError
 */
/**
 * @summary
 * GlobNotImplemented indicates that Glob is not implemented by the object.
 * @name GlobNotImplemented
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @memberof module:vanadium.rpc.reserved
 * @augments module:vanadium.verror.VanadiumError
 */
