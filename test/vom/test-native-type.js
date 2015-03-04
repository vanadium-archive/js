var test = require('prova');

var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer');
var ByteArrayMessageReader = require(
    './../../src/vom/byte-array-message-reader');
var Encoder = require('./../../src/vom/encoder');
var Decoder = require('./../../src/vom/decoder');
var Time = require('../../src/v.io/v23/vdlroot/time').Time;
require('../../src/vom/native-types'); // Register native types.

var expectedDate = new Date(1999, 9, 9, 9, 9, 999);

function encodeDecodeDate(encodeType) {
  var input = expectedDate;
  var messageWriter = new ByteArrayMessageWriter();
  var encoder = new Encoder(messageWriter);
  encoder.encode(input, encodeType);

  var messageReader = new ByteArrayMessageReader(
    messageWriter.getBytes());
  var decoder = new Decoder(messageReader);
  return decoder.decode();
}

// TODO(bprosnitz) Implement native type guessing and enable this test.
test('test encoding and decoding javascript date without type',
  function(t) {
  var result = encodeDecodeDate();
  t.ok(result instanceof Date, 'Decoded date should be a date object');
  var diff = Math.abs(expectedDate - result);
  t.ok(diff < 1, 'Should decode to the expected date');
  t.end();
});

test('test encoding and decoding javascript date with type',
  function(t) {
  var result = encodeDecodeDate(Time.prototype._type);
  t.ok(result instanceof Date, 'Decoded date should be a date object');
  t.equal(result.getTime(), expectedDate.getTime(),
    'Should decode to the expected date');
  t.end();
});
