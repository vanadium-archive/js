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
   * @memberof module:vanadium.vdl
   */
  Registry: require('./registry'),
  Type: require('./type'),
};

module.exports.signature = require('../gen-vdl/v.io/v23/vdlroot/signature');
module.exports.time = require('../gen-vdl/v.io/v23/vdlroot/time');

require('./es6-shim.js'); // If necessary, adds ES6 Map, Set, etc.
