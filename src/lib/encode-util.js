var vom = require('../vom/vom');
var bytes2Hex = require('../vdl/byte-util').bytes2Hex;
module.exports = {
  encode: encode,
};

function encode(v) {
  var writer = new vom.ByteArrayMessageWriter();
  var encoder = new vom.Encoder(writer);
  encoder.encode(v);
  return bytes2Hex(writer.getBytes());
}
