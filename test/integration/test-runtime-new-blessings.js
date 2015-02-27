var test = require('prova');
var vanadium = require('../../');
var Blessings = require('../../src/security/blessings.js');
var config = require('./default-config');

test('Test creating a new blessing - ' +
  'runtime.newBlessings(extension, callback)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    runtime.newBlessings('alice', function(err, blessings) {
      assert.error(err);
      assert.ok(blessings instanceof Blessings, 'should be a Blessings');
      runtime.close(assert.end);
    });
  });
});

test('Test creating a new blessing - ' +
  'var promise = runtime.newBlessings(extension)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    .newBlessings('alice')
    .then(function(id) {
      assert.ok(id instanceof Blessings, 'should be a Blessings');
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

// TODO(jasoncampbell): Add failure tests once it's possible to close the
// runtime and propagate errors from Proxy.prototype.sendRequest properly.
