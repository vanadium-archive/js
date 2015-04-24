// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary Namespace vdl defines the Vanadium Definition Language type and
 * value system.
 *
 * @description
 * <p>Namespace vdl defines the Vanadium Definition Language type and value
 * system.</p>
 *
 * <p>VDL is an interface definition language designed to enable interoperation
 * between clients and servers executing in heterogeneous environments.</p>
 *
 * For example, VDL enables a frontend written in Javascript running on a phone
 * to communicate with a backend written in Go running on a server.</p>
 *
 * <p>VDL is compiled into an intermediate representation that is used to
 * generate code in each target environment.</p>
 *
 * <p>The concepts in VDL are similar to the concepts used in general-purpose
 * languages to specify interfaces and communication protocols.</p>
 *
 * @namespace
 * @name vdl
 * @memberof module:vanadium
 */
module.exports = {
  kind: require('./kind'),
  types: require('./types'),
  BigInt: require('./big-int'),
  canonicalize: require('./canonicalize'),
  Complex: require('./complex'),
  /**
   * Type registry that contains a mapping of vdl types
   * to constructors
   * @memberof module:vanadium.vdl
   */
  registry: require('./registry'),
  Type: require('./type'),
};

/**
 * @namespace
 * @name signature
 * @summary Namespace of types representing interface and method signatures.
 * @description Namespace of types representing interface and method signatures.
 * @memberof module:vanadium.vdl
 */
module.exports.signature = require('../gen-vdl/v.io/v23/vdlroot/signature');
/**
 * @namespace
 * @name time
 * @summary Namespace of types representing absolute and relative times.
 * @description Namespace of types representing absolute and relative times.
 * @memberof module:vanadium.vdl
 */
module.exports.time = require('../gen-vdl/v.io/v23/vdlroot/time');

require('./es6-shim.js'); // If necessary, adds ES6 Map, Set, etc.
