// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = {
  Kind: require('./kind'),
  Types: require('./types'),
  BigInt: require('./big-int'),
  /**
   * Namespace of utilities to canonicalize vdl types
   * for use in encoding and decoding values.
   * @namespace
   * @memberof module:vanadium.vdl
   */
  Canonicalize: require('./canonicalize'),
  Complex: require('./complex'),
  /**
   * Type registry that contains a mapping of vdl types
   * to constructors
   * @property {Registry}
   * @memberof module:vanadium.vdl
   */
  Registry: require('./registry'),
  Type: require('./type'),
};

/**
 * @namespace
 * @name signature
 * @memberof module:vanadium.vdl
 */
module.exports.signature = require('../gen-vdl/v.io/v23/vdlroot/signature');
/**
 * @namespace
 * @name time
 * @memberof module:vanadium.vdl
 */
module.exports.time = require('../gen-vdl/v.io/v23/vdlroot/time');

require('./es6-shim.js'); // If necessary, adds ES6 Map, Set, etc.
