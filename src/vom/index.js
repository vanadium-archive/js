module.exports = {
  ByteArrayMessageReader: require('./byte-array-message-reader'),
  ByteArrayMessageWriter: require('./byte-array-message-writer'),
  Encoder: require('./encoder'),
  Decoder: require('./decoder'),
  encode: require('./encode'),
  decode: require('./decode')
};

require('./native-types'); // Register standard native types.
