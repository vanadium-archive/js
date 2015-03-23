/**
 * Interface describes the signature of an interface.
 * @constructor
 * @name Interface
 * @property {string} name
 * @property {string} pkgPath
 * @property {string} doc
 * @property {module:vanadium.vdl.signature.Embed[]} embeds No special ordering.
 * @property {module:vanadium.vdl.signature.Method[]} method Ordered by method
 * name.
 * @memberof module:vanadium.vdl.signature
 */
/**
 * Embed describes the signature of an embedded interface.
 * @constructor
 * @name Embed
 * @property {string} name
 * @property {string} pkgPath
 * @property {string} doc
 * @memberof module:vanadium.vdl.signature
 */
/**
 * Method describes the signature of an interface method.
 * @constructor
 * @name Method
 * @property {string} Name
 * @property {string} PkgPath
 * @property {module:vanadium.vdl.signature.Arg[]} inArgs Input arguments
 * @property {module:vanadium.vdl.signature.Arg[]} outArgs Output arguments
 * @property {module:vanadium.vdl.signature.Arg} inStream Input stream
 * (optional)
 * @property {module:vanadium.vdl.signature.Arg} outStream Output stream
 * (optional)
 * @property {*} tags Method tags
 * @memberof module:vanadium.vdl.signature
 */
/**
 * Arg describes the signature of a single argument.
 * @constructor
 * @name Arg
 * @property {string} name
 * @property {string} doc
 * @property {module:vanadium.vdl.Type} type
 * @memberof module:vanadium.vdl.signature
 */
/**
 * Duration represents the elapsed duration between two points in time,
 * with up to nanosecond precision.
 * @constructor
 * @name Duration
 * @property seconds {integer} Seconds represents the seconds in the duration.
 * @property nanos {integer} In normalized form, durations less than one second
 * are represented with 0. Seconds and +/-Nanos. For durations one second or
 * more, the sign of Nanos must match Seconds, or be 0.
 * @memberof module:vanadium.vdl.time
 */

