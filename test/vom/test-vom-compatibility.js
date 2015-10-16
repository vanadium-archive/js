// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for encoder and decoder compatibility.
 */

var test = require('prova');

var testdata = require('../vdl-out/v.io/v23/vom/testdata/data80');

var ByteArrayMessageReader = require(
    './../../src/vom/byte-array-message-reader.js');
var ByteArrayMessageWriter = require(
    './../../src/vom/byte-array-message-writer.js');
var Decoder = require('./../../src/vom/decoder.js');
var Encoder = require('./../../src/vom/encoder.js');
var vdl = require('./../../src/vdl');
var canonicalize = require('./../../src/vdl/canonicalize.js');
var typeCompatible = require('./../../src/vdl/type-compatible.js');
var util = require('./../../src/vdl/byte-util.js');
var stringify = require('./../../src/vdl/stringify.js');

var nullAny = new (vdl.registry.lookupOrCreateConstructor(vdl.types.ANY))
  (null, true);

// Test that the received type matches the expected type.
testdata.Tests.val.forEach(function(t) {
  if (t.value === null) {
    // null any (not wrapped) because it is within TestCase struct
    t.value = nullAny;
  }
  test('type toString compatibility - ' + t.name, function(assert) {
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
    decoder.decode().then(function(result) {
      assert.equal(stringify(result), stringify(t.value), t.name +
        ' value comparison');
      assert.deepEqual(result._type, t.value._type, t.name +
                       ' type comparison');
      assert.deepEqual(result._type.toString(), t.typeString,
        t.name + ' type string ok');
      assert.deepEqual(result.prototype, t.value.prototype,
          t.name + ' prototype comparison');

      // Ensure that we lost no information; encode(decode(t.hex)) === t.hex.
      var messageWriter = new ByteArrayMessageWriter();
      var encoder = new Encoder(messageWriter);
      encoder.encode(result);
      var hex = util.bytes2Hex(messageWriter.getBytes());
      assert.equal(hex, t.hex, t.name + ' hex comparison');

      assert.end();
    }).catch(assert.end);
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

// Test that values follow the VDL conversion rules; success cases.
var convertTests = testdata.ConvertTests.val;
convertTests.forEach(function(convertLists, typename) {
  test('vom type conversion success - ' + typename, function(assert) {
    // Calues within the same convert list are convertible.
    for (var level = 0; level < convertLists.length; level++) {
      var convertData = convertLists[level];
      var name = convertData.name;
      var values = convertData.values;

      // Each pair of values should be able to convert to every other value's
      // type within a set.
      // TODO(alexfandrianto): also test the unwrapped native value...
      for (var i = 0; i < values.length; i++) {
        var val1 = values[i];
        for (var j = 0; j < values.length; j++) {
          var val2 = values[j];
          var convert1 = canonicalize.reduce(val1, val2._type);

          assert.equal(stringify(convert1), stringify(val2), name +
            ' converts to ' + val2._type.toString());
        }
      }
    }
    assert.end();
  });
});

// Test that values follow the VDL conversion rules; failure cases.
convertTests.forEach(function(convertLists, typename) {
  test('vom type conversion failure - ' + typename, function(assert) {
    // Higher-level lists cannot down convert to lower-level lists.
    for (var level = 0; level < convertLists.length; level++) {
      var values = convertLists[level].values;

      for (var lower = 0; lower < level; lower++) {
        var targetType = convertLists[lower].primaryType;
        var targetName = convertLists[lower].name;

        // Every conversion attempt must throw.
        for (var i = 0; i < values.length; i++) {
          assert.throws(canonicalize.reduce.bind(null, values[i], targetType),
            targetName + ' cannot be converted from this instance of ' +
            values[i]._type.toString());
        }
      }
    }
    assert.end();
  });
});
