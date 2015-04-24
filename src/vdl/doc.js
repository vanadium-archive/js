// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @constructor
 * @name Interface
 * @summary Describes the signature of an interface.
 * @property {string} name Name of the interface.
 * @property {string} pkgPath Path of the interface.
 * @property {string} doc Documentation for the interface.
 * @property {module:vanadium.vdl.signature.Embed[]} embeds No special ordering.
 * @property {module:vanadium.vdl.signature.Method[]} method Ordered by method.
 * name.
 * @memberof module:vanadium.vdl.signature
 */
/**
 * @constructor
 * @name Embed
 * @summary Describes the signature of an embedded interface.
 * @property {string} name Name of the embedded interface.
 * @property {string} pkgPath Path of the embedded interface.
 * @property {string} doc Documentation for the embedded interface.
 * @memberof module:vanadium.vdl.signature
 */
/**
 * @constructor
 * @name Method
 * @summary Describes the signature of an interface method.
 * @property {string} Name
 * @property {string} PkgPath
 * @property {module:vanadium.vdl.signature.Arg[]} inArgs Input arguments.
 * @property {module:vanadium.vdl.signature.Arg[]} outArgs Output arguments.
 * @property {module:vanadium.vdl.signature.Arg} inStream Input stream.
 * (optional)
 * @property {module:vanadium.vdl.signature.Arg} outStream Output stream.
 * (optional)
 * @property {*} tags Method tags.
 * @memberof module:vanadium.vdl.signature
 */
/**
 * @constructor
 * @name Arg
 * @summary Describes the signature of a single argument.
 * @property {string} name Name of the argument.
 * @property {string} doc Documentation for the argument.
 * @property {module:vanadium.vdl.Type} type Type of the argument.
 * @memberof module:vanadium.vdl.signature
 */
/**
 * @constructor
 * @name Duration
 * @summary Represents the elapsed duration between two points in time, with up
 * to nanosecond precision.
 * @property seconds {number} Seconds represents the seconds in the duration.
 * @property nanos {number} In normalized form, durations less than one second
 * are represented with 0. Seconds and +/-Nanos. For durations one second or
 * more, the sign of Nanos must match Seconds, or be 0.
 * @memberof module:vanadium.vdl.time
 */

