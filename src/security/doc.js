// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * A file for JSDocs for vdl generated files in security
 */
/**
 * @summary BlessingPattern is a pattern that is matched by specific blessings.
 * @description
 * <p>A pattern can either be a blessing (slash-separated human-readable string)
 * or a blessing ending in "/$". A pattern ending in "/$" is matched exactly
 * by the blessing specified by the pattern string with the "/$" suffix
 * stripped out. For example, the pattern "a/b/c/$" is matched by exactly by the
 * blessing "a/b/c".</p>
 *
 * <p>A pattern not ending in "/$" is more permissive, and is also matched by
 * blessings that are extensions of the pattern (including the pattern itself).
 * For example, the pattern "a/b/c" is matched by the blessings "a/b/c",
 * "a/b/c/x", "a/b/c/x/y", etc.</p>
 *
 * @name BlessingPattern
 * @constructor
 * @property {string} val The blessing pattern
 * @param {string} pattern The pattern
 * @memberof module:vanadium.security
 */
/**
 * @summary A descriptor that is used to associate a caveat validation function
 * (addressed by a globally unique identifier) and the data needed by the
 * validation function.
 * @name CaveatDescriptor
 * @memberof module:vanadium.security
 * @property {module:vanadium.uniqueId.Id.Id} id The uniqe id for the caveat
 * validation function
 * @property {module:vanadium.vdl.Type} paramType The type of
 * the data that will be passed into the function.
 * @constructor
 * @param {object} descriptor The descriptor
 * @param {module:vanadium.uniqueId.Id.Id} descriptor.id The unique id for the
 * caveat validation funciton
 * @param {module:vanadium.vdl.Type} descriptor.paramType The type of
 * the data that will be passed into the function.
 */
/**
 * @summary An explanation of why a blessing failed validation.
 * @name RejectedBlessing
 * @memberof module:vanadium.security
 * @property {string} blessing The blessing that failed validation.
 * @property {module:vanadium.error.VanadiumError} inValue.err The err that
 * occured
 * @constructor
 * @param {object} inValue
 * @param {string} inValue.blessing The blessing that failed validation.
 * @param {module:vanadium.error.VanadiumError} inValue.err The err that
 * occured
 */
/**
 * Represents a caveat that will always succeed or fail.  The data
 * should be a boolean.
 * @name ConstCaveat
 * @type module:vanadium.security.CaveatDescriptor
 * @const
 * @memberof module:vanadium.security
 */
/**
 * Represents a caveat that validates iff the current time is no later
 * than the specified time.  The data should be a date.
 * @name ExpiryCaveatX
 * @type module:vanadium.security.CaveatDescriptor
 * @const
 * @memberof module:vanadium.security
 */
/**
 * Represents a caveat that validates iff the method being invoked is
 * included in the array of strings passed in.  An empty list means that
 * the holder cannot invoke any methods.
 * @name MethodCaveatX
 * @type module:vanadium.security.CaveatDescriptor
 * @const
 * @memberof module:vanadium.security
 */
/**
 * PeerBlessingsCaveat represents a caveat that validates iff the peer being
 * communicated with (local end of the call) has a blessing name matching at
 * least one of the patterns in the list. An empty list implies that the caveat
 * is invalid.
 * @name PeerBlessingsCaveat
 * @type module:vanadium.security.CaveatDescriptor
 * @const
 * @memberof module:vanadium.security
 */
/**
 * @summary An error that means that no caveat has been registered
 * @name CaveatNotRegisteredError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.uniqueId.Id} id The id not registered.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the caveat cannot have a param type of any.
 * @name CaveatParamAnyError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.uniqueId.Id} id The id of the caveat with the
 * problem.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the type of the passed in data does not
 * match the type expected by the descriptor.
 * @name CaveatParamTypeMismatchError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.uniqueId.Id} id The id of the caveat with the
 * problem.
 * @param {module:vanadium.vdl.Type} got The type passed in
 * @param {module:vanadium.vdl.Type} want The type passed expected.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the param type could not be encoded.
 * @name CaveatParamCodingError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.uniqueId.Id} id The id of the caveat with the
 * problem.
 * @param {module:vanadium.vdl.Type} got The type of the caveat data.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the caveat didn't validate.
 * @name CaveatValidationError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.error.VanadiumError} err The error that occured.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the
 * [ConstCaveat]{@link module:vanadium.security.ConstCaveat}
 * failed to validate.
 * @name ConstCaveatValidationError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the
 * [ExpiryType]{@link module:vanadium.security.ExpiryCaveatX} failed to
 * validate.
 * @name ExpiryCaveatValidationError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {date} expiry The time the caveat expires
 * @param {date} now The current time
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the
 * [MethodCaveat]{@link module:vanadium.security.MethodCaveatX} failed to
 * validate.
 * @name MethodCaveatValidationError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {string} method The method that was being invoked.
 * @param {array<string>} validMethods The methods that are allowed by
 * the caveat.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means that the
 * [PeerBlessingsCaveat]{@link module:vanadium.security.PeerBlessingsCaveat}
 * failed to validate.
 * @name PeerBlessingsCaveatValidationError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {string} method The method that was being invoked.
 * @param {array<string>} validMethods The methods that are allowed by
 * the caveat.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * @summary An error that means a remote principal is not authorized by a local
 * principal
 * @name AuthorizationFailedError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {array<string>} remoteBlessings Remote blessings
 * @param {array<module:vanadium.security.RejectedBlessing>} rejectedBlessings
 * Remote rejected blessing
 * @param {array<string>} localBlessings Local blessings
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * A function that returns an error if the operation is not authorized.
 * @callback Authorize
 * @param {module:vanadium.context.Context} context The context of the
 * rpc.
 * @param {module:vanadium.security.Authorize~callback} cb The callback to
 * call with the result if the rpc is asynchronous.  This can be ignored
 * if the Authorizer returns a promise or the result.
 * @return {Promise|Error} Either an error that occurred (or null if there was
 * no error) or a Promise that will be resolved if the authorization succeeded
 * and rejected if it failed.
 * @memberof module:vanadium.security
 */
/**
 * Callback passed into Authorize
 * @callback Authorize~callback
 * @param {Error} err If set, the reason that the authorization failed.
 * @memberof module:vanadium.security
 */
