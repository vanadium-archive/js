var ByteArrayMessageReader = require('./byte-array-message-reader');
var Decoder = require('./decoder');


/**
 * decode - VOM decode bytes
 *
 * @param  {Uint8Array} bytes    VOM-encoded bytes
 * @param  {boolean=false} deepWrap true if the values on the object should
 * remain wrapped with type information deeply, false (default) to strip
 * deep type information and obtain a more usage-friendly value
 * @return {*} decoded value
 */
module.exports = function decode(bytes, deepWrap) {
  var reader = new ByteArrayMessageReader(bytes);
  var decoder = new Decoder(reader, deepWrap);
  return decoder.decode();
};
