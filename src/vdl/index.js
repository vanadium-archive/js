module.exports = {
  Kind: require('./kind'),
  Types: require('./types'),
  BigInt: require('./big-int'),
  Canonicalize: require('./canonicalize'),
  Complex: require('./complex'),
  Registry: require('./registry'),
  Type: require('./type'),
};

module.exports.signature = require('../gen-vdl/v.io/v23/vdlroot/signature');
module.exports.time = require('../gen-vdl/v.io/v23/vdlroot/time');

require('./es6-shim.js'); // If necessary, adds ES6 Map, Set, etc.
