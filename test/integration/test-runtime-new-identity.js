var test = require('prova');
var veyron = require('../../');
var PublicId = require('../../src/security/public.js');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};

test('runtime.newIdentity(name, callback)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.newIdentity('alice', function(err, id) {
      assert.error(err);
      assert.ok(id instanceof PublicId, 'should be a PublicId');
      runtime.close(assert.end);
    });
  });
});

test('var promise = runtime.newIdentity(name)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    .newIdentity('alice')
    .then(function(id) {
      assert.ok(id instanceof PublicId, 'should be a PublicId');
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
