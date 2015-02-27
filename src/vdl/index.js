module.exports = {
  Kind: require('./kind'),
  Types: require('./types'),
  BigInt: require('./big-int'),
  Canonicalize: require('./canonicalize'),
  Complex: require('./complex'),
  Builtins: require('./builtins'),
  Registry: require('./registry'),
  Util: require('./byte-util'),
  MiscUtil: require('./util'),
  Type: require('./type'),
  TypeUtil: require('./type-util'),
  Stringify: require('./stringify')
};

require('./native-types'); // Register standard native types.
require('./es6-shim.js'); // If necessary, adds ES6 Map, Set, etc.
