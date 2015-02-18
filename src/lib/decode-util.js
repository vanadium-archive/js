var vom = require('../vom/vom');
var hex2Bytes = require('../vdl/byte-util').hex2Bytes;
var unwrap = require('../vdl/type-util').unwrap;
module.exports = {
  decode: decode,
};

// TODO(alexfandrianto): To receive deeply wrapped types, use true below.
// We may need to plumb it through elsewhere in the system, but this is one
// entry point. Currently, no callers use deepWrap === true.
function decode(hex, deepWrap) {
  deepWrap = deepWrap || false;

  var reader = new vom.ByteArrayMessageReader(hex2Bytes(hex));
  var decoder = new vom.Decoder(reader, deepWrap);
  var decoded = decoder.decode();
  if (deepWrap) {
    return decoded;
  }
  return unwrap(decoded); // drop top-level type information
}
