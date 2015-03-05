var ByteArrayMessageWriter = require('./byte-array-message-writer');
var Encoder = require('./encoder');


/**
 * encode - VOM encode a value
 *
 * @private
 * @param  {*} v value to encode
 * @return {Uint8Array} encoded bytes
 */
module.exports = function encode(v) {
  var writer = new ByteArrayMessageWriter();
  var encoder = new Encoder(writer);
  encoder.encode(v);
  return writer.getBytes();
};
