var vom = require('vom');
module.exports = {
  tryDecode: tryDecode,
};

function tryDecode(hex) {
  var reader = new vom.ByteArrayMessageReader(vom.Util.hex2Bytes(hex));
  var decoder = new vom.Decoder(reader);
  return decoder.decode();
}
