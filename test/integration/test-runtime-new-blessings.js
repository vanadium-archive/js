var test = require('prova');
var veyron = require('../../');
var Blessings = require('../../src/security/blessings.js');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};

test('runtime.newBlessings(extension, callback)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.newBlessings('alice', function(err, blessings) {
      assert.error(err);
      assert.ok(blessings instanceof Blessings, 'should be a Blessings');
      runtime.close(assert.end);
    });
  });
});

test('var promise = runtime.newBlessings(extension)', function(assert) {
  veyron.init(config, function(err, runtime) {
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
