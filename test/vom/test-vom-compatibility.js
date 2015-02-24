/**
 * @fileoverview Tests for encoder and decoder compatibility.
 */

var test = require('prova');

var testdata = require('../vdl-out/v.io/v23/vom/testdata');

var ByteArrayMessageReader = require(
    './../../src/vom/byte-array-message-reader.js');
var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer.js');
var Decoder = require('./../../src/vom/decoder.js');
var Encoder = require('./../../src/vom/encoder.js');
var typeCompatible = require('./../../src/vdl/type-compatible.js');
var util = require('./../../src/vdl/byte-util.js');

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

// Test that the types within the same list are compatible.
var compatTests = testdata.CompatTests.val;
compatTests.forEach(function(typelist, typename) {
  test('vom type compatibility - ' + typename, function(assert) {
    for (var j = 0; j < typelist.length; j++) {
      var type1 = typelist[j];

      // Check that type1 and type2 are compatible, in both orders.
      for (var k = 0; k < typelist.length; k++) {
        var type2 = typelist[k];

        assert.ok(typeCompatible(type1, type2), type1.toString() +
          ' and ' + type2.toString() + ' should be compatible');
      }
    }
    assert.end();
  });
});

// Test that the types between lists are incompatible.
compatTests.forEach(function(typelist1, typename1) {
  compatTests.forEach(function(typelist2, typename2) {
    test('vom type incompatibility - ' + typename1 + ' vs ' + typename2,
      function(assert) {
        if (typename1 === typename2) {
          assert.end();
          return;
        }
        // Check each set of types against the other sets in both orders.
        // All pairs of types from different sets should be incompatible.
        for (var i = 0; i < typelist1.length; i++) {
          var type1 = typelist1[i];
          for (var j = 0; j < typelist2.length; j++) {
            var type2 = typelist2[j];

            assert.notOk(typeCompatible(type1, type2), type1.toString() +
              ' and ' + type2.toString() + ' should not be compatible');
          }
        }

        assert.end();
      }
    );
  });
});