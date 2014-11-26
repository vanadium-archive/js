var vom = require('vom');
module.exports = {
  encode: encode,
};

function encode(v) {
  var writer = new vom.ByteArrayMessageWriter();
  var encoder = new vom.Encoder(writer);
  encoder.encode(v);
  return vom.Util.bytes2Hex(writer.getBytes());
}
