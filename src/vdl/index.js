module.exports = {
  Kind: require('./kind'),
  Types: require('./types'),
  BigInt: require('./big-int'),
  Canonicalize: require('./canonicalize'),
  Complex: require('./complex'),
  Registry: require('./registry'),
  Type: require('./type'),
};

require('./es6-shim.js'); // If necessary, adds ES6 Map, Set, etc.
