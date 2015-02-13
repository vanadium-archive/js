/**
 * @fileoverview Tests for the uniqueid library.
 */

var test = require('prova');
var uniqueid = require('../../src/lib/uniqueid');
var vdl = require('../../src/v.io/core/veyron2/uniqueid/uniqueid');
var typeutil = require('../../src/vom/type-util');

test('Test random', function(assert) {
  var id = uniqueid.random();

  assert.ok(id instanceof vdl.Id);
  assert.end();
});

test('Test hex string conversion', function(assert) {
  var hex = '9876543210fedcba0123456789abcdef';
  var bytes = [
    152, 118, 84, 50, 16, 254, 220, 186, 1, 35, 69, 103, 137, 171, 205, 239];

  var id = uniqueid.fromHexString(hex);
  var unwrapped = typeutil.unwrap(id);
  for (var j = 0; j < 16; j++) {
    assert.equals(unwrapped[j], bytes[j]);
  }
  var derived = uniqueid.toHexString(id);
  assert.equals(derived, hex);

  assert.end();
});

