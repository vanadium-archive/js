var test = require('prova');
var veyron = require('../../');
var config = require('./default-config');
var service = {
  sayHi: function() {
    console.log('Hello');
  }
};

test('runtime.serve(name, service, callback)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.serve('tv/hi', service, function(err, endpoint) {
      assert.error(err);
      assert.ok(endpoint && endpoint.match('@2@tcp@'), 'got endpoint');
      runtime.close(assert.end);
    });
  });
});

test('runtime.serve(name, service, callback) - service', function(assert) {
  veyron.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    assert.error(err);

    runtime.serve('tv/hi', service, function(err, endpoint) {
      assert.ok(err instanceof Error, 'should fail');
      runtime.close(assert.end);
    });
  });
});

test('var promise = runtime.serve(name, service)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    .serve('tv/hi', service)
    .then(function(endpoint) {
      assert.ok(endpoint.match('@2@tcp@'));
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('var promise = runtime.serve(name, service) - failure', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    .serve('tv/hi', service)
    .then(function(endpoint) {
      assert.ok(endpoint.match('@2@tcp@'));
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('runtime.serve(name, service, callback) - served twice', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime.serve('tv/hi', service, function(err, firstEndpoint) {
      assert.error(err);

      runtime.serve('tv/hi', service, function(err, endpoint) {
        assert.error(err);
        assert.ok(endpoint && endpoint.match('@2@tcp@'), 'got endpoint');
        assert.equal(endpoint, firstEndpoint);
        runtime.close(assert.end);
      });
    });
  });
});

test('var promise = runtime.serve(name, service) - twice', function(assert) {
  var firstEndpoint;

  veyron.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    .serve('tv/hi', service)
    .then(function(endpoint) {
      firstEndpoint = endpoint;
      return runtime.serve('tv/hi', service);
    })
    .then(function(endpoint) {
      assert.ok(endpoint.match('@2@tcp@'));
      assert.equal(endpoint, firstEndpoint);
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

// TODO(aghassemi) tests and implementation for:
// Publishing multiple times under different names
