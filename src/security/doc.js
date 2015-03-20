/*
 * A file for JSDocs for vdl generated files in security
 */
/**
 * BlessingPattern is a pattern that is matched by specific blessings.
 *
 * A pattern can either be a blessing (slash-separated human-readable string)
 * or a blessing ending in "/$". A pattern ending in "/$" is matched exactly
 * by the blessing specified by the pattern string with the "/$" suffix
 * stripped out. For example, the pattern "a/b/c/$" is matched by exactly by the
 * blessing "a/b/c".
 *
 * A pattern not ending in "/$" is more permissive, and is also matched by
 * blessings that are extensions of the pattern (including the pattern itself).
 * For example, the pattern "a/b/c" is matched by the blessings "a/b/c",
 * "a/b/c/x", "a/b/c/x/y", etc.
 *
 * @name BlessingPattern
 * @constructor
 * @param {string} pattern The pattern
 * @memberof module:vanadium.security
 */
/**
 * @name AccessList
 * @constructor
 * @param {object} acl The value to construct from
 * @param {array} acl.in <p>An array of [BlessingPatterns]{@link
 * module:vanadium.security.BlessingPatterns}/strings that denotes the set
 * of blessings that should be granted access, unless blacklisted by notIn.</p>
 * <p>For example:</p>
 * <code>
 *    in: ['alice/family']
 * </code>
 * grants access to a principal that presents at least one of 'alice/family',
 * 'alice/family/friend', 'alice/family/friend/spouse', etc.
 * @param {array} acl.notNin <p>An array of strings that denotes the set of
 * blessings (and their delegates) that have been explicitly blacklisted
 * from the in set.
 * <p>For example:</p>
 * <code>
 *    in: ['alice/friend'], notIn: ['alice/friend/bob']
 * </code>
 * grants access to a principal that presents at least one of 'alice/friend',
 * 'alice/friend/carol', etc, but NOT to a principal that presents
 * 'alice/friend/bob or 'alice/friend/bob/spouse' etc.
 * @memberof module:vanadium.security
 * AccessList represents an Access Control List - a set of blessings that
 * should be granted access.
 */
/**
 * Permissions maps string tags to [AccessList]
 * {@link module:vanadium.security.AccessList} specifying the blessings
 * required to invoke methods with that tag
 * @name Permissions
 * @constructor
 * @param {map} permissions An ES6 Map of string tags to AccessLists
 * @memberof module:vanadium.security
 */
/**
 * Tag is used to associate methods with an [AccessList]
 * {@link module:vandiume.security.AccessList} in [Permissions]
 * {@link module:vanadium.security.Permissions}.
 * @name Tag
 * @constructor
 * @param {string} val The value of the tag
 * @memberof module:vanadium.security
 */
/**
 * Used for operations that require privileged access for object
 * administration.
 * @name Admin
 * @type module:vanadium.security.Tag
 * @memberof module:vanadium.security
 */
/**
 * Used for operations that return debugging information about the object
 * @name Debug
 * @type module:vanadium.security.Tag
 * @memberof module:vanadium.security
 */
/**
 * Used for operations that do not mutate the state of the object
 * @name Read
 * @type module:vanadium.security.Tag
 * @memberof module:vanadium.security
 */
/**
 * Used for operations that mutate the state of the object.
 * @name Write
 * @type module:vanadium.security.Tag
 * @memberof module:vanadium.security
 */
/**
 * Used for operations that involve namespace navigation
 * @name Resolve
 * @type module:vanadium.security.Tag
 * @memberof module:vanadium.security
 */
/**
 * Error that means the [AccessList]
 * {@link module:vanadium.security.AccessList} is too big.
 * @name TooBigError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * Error that means that no blessings matched patterns in the access list.
 * @name AccessListMatchError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {array} validBlessings A list of strings that represent valid
 * blessings
 * @param {array} rejectedBlessings A list of blessings that are rejected.
 * The array has [RejectedBlessings]
 * {@link module:vanadium.security.RjectedBlessings}.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * Error that means that no blessings have access to the specified access tag
 * (e.g. No Read Access or No Admin Access)
 * @name NoPermissionsError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {array} validBlessings A list of strings that represent valid
 * blessings
 * @param {array} rejectedBlessings A list of blessings that are rejected.
 * The array has [RejectedBlessings]
 * @param {module:vanadium.security.Tag} tag Access tag.
 * {@link module:vanadium.security.RjectedBlessings}.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * A descriptor that is used to associate a caveat validation function (
 * addressed by a globally unique identifier) and the data needed by the
 * validation function.
 * @name CaveatDescriptor
 * @memberof module:vanadium.security
 * @constructor
 * @param {object} descriptor The descriptor
 * @param {module:vanadium.UniqueId} descriptor.id The unique id for the
 * caveat validation funciton
 * @param {module:vanadium.vdl.Type} descriptor.paramType The type of
 * the data that will be passed into the function.
 */
/**
 * An explanation of why a blessing failed validation.
 * @name RejectedBlessing
 * @memberof module:vanadium.security
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
 * An error that means that no caveat has been registered
 * @name CaveatNotRegisteredError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.UniqueId} id The id not registered.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * An error that means that the caveat cannot have a param type of any.
 * @name CaveatParamAnyError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.UniqueId} id The id of the caveat with the problem.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * An error that means that the type of the passed in data does not match
 * the type expected by the descriptor.
 * @name CaveatParamTypeMismatch
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.UniqueId} id The id of the caveat with the problem.
 * @param {module:vanadium.vdl.Type} got The type passed in
 * @param {module:vanadium.vdl.Type} want The type passed expected.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * An error that means that the param type could not be encoded.
 * @name CaveatParamCodingError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {module:vanadium.UniqueId} id The id of the caveat with the problem.
 * @param {module:vanadium.vdl.Type} got The type of the caveat data.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * An error that means that the caveat didn't validate.
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
 * An error that means that the [ConstCaveat]
 * {@link module:vanadium.security.ConstCaveat} failed to validate.
 * @name ConstCaveatValidationError
 * @memberof module:vanadium.security
 * @constructor
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 * @augments module:vanadium.errors.VanadiumError
 */
/**
 * An error that means that the [ExpiryType]
 * {@link module:vanadium.security.ExpiryCaveatX} failed to validate.
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
 * An error that means that the [MethodCaveat]
 * {@link module:vanadium.security.MethodCaveatX} failed to validate.
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

