/**
 * @fileoverview Tests for encoder and decoder compatibility.
 */

var test = require('prova');

var testdata = require('../vdl-out/v.io/core/veyron2/vom/testdata/testdata');

var ByteArrayMessageReader = require(
    './../../src/vom/byte-array-message-reader.js');
var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer.js');
var Decoder = require('./../../src/vom/decoder.js');
var Encoder = require('./../../src/vom/encoder.js');
var util = require('./../../src/vom/byte-util.js');

// Test that the received type matches the expected type.
testdata.Tests.val.forEach(function(t) {
  test('type compatibility - ' + t.name, function(assert) {
    var typeStr = t.typeString;
    var type = t.value._type;
    assert.equal(type.toString(), typeStr, 'type string matches');
    assert.end();
  });
});

// Test that the encoded typed constants match the standard vom byte-encoding.
testdata.Tests.val.forEach(function(t) {
  test('encode compatibility - ' + t.name, function(assert) {
    var messageWriter = new ByteArrayMessageWriter();
    var encoder = new Encoder(messageWriter);
    encoder.encode(t.value);
    var data = util.bytes2Hex(messageWriter.getBytes());
    assert.equal(data, t.hex, t.name + ' hex comparison');

    assert.end();
  });
});

// Test that the decoded typed constants match the standard vom byte-encoding.
testdata.Tests.val.forEach(function(t, i) {
  test('decode compatibility - ' + t.name, function(assert) {
    var data = util.hex2Bytes(t.hex);
    var messageReader = new ByteArrayMessageReader(data);
    var decoder = new Decoder(messageReader, false);
    var result = decoder.decode();
    assert.deepEqual(result, t.value, t.name + ' value comparison');
    assert.deepEqual(result._type, t.value._type, t.name + ' type comparison');
    assert.deepEqual(result.prototype, t.value.prototype,
        t.name + ' prototype comparison');

    // Ensure that we lost no information; encode(decode(t.hex)) === t.hex.
    var messageWriter = new ByteArrayMessageWriter();
    var encoder = new Encoder(messageWriter);
    encoder.encode(result);
    var hex = util.bytes2Hex(messageWriter.getBytes());
    assert.equal(hex, t.hex, t.name + ' hex comparison');

    assert.end();
  });
});
