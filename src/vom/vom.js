module.exports = {
  Kind: require('./kind'),
  Types: require('./types'),
  BigInt: require('./big-int'),
  Canonicalize: require('./canonicalize'),
  Complex: require('./complex'),
  Builtins: require('./builtins'),
  ByteArrayMessageReader: require('./byte-array-message-reader'),
  ByteArrayMessageWriter: require('./byte-array-message-writer'),
  Registry: require('./registry'),
  Util: require('./byte-util'),
  MiscUtil: require('./util'),
  Type: require('./type'),
  TypeUtil: require('./type-util'),
  Stringify: require('./stringify')
};

// This can't be in the big block of requires because encoder/decoder depends
// on vdl generated files (through bootstrap-types), which intern depends on
// vom.  When we separate out the exports like this, the important parts of
// vom that is required by vdl generated files are already exported.
// TODO(bjornick): Merge this with the block above when we fix:
// https://github.com/veyron/release-issues/issues/1109
module.exports.Encoder= require('./encoder');
module.exports.Decoder= require('./decoder');

require('./es6-shim.js'); // If necessary, adds ES6 Map, Set, etc.
