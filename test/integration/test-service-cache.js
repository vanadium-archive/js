var test = require('prova');
var veyron = require('../../');
var NoExistError = veyron.errors.NoExistError;
var config = require('./default-config');
var service = require('./get-service');
var Promise = require('bluebird');

test('Test set() of Go sample cache service - ' +
  'cache.set(key, value, callback)', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    cache.set(ctx, 'foo', 'bar', function(err, result) {
      assert.error(err);
      end(assert);
    });
  });
});

test('Test set() of Go sample cache service - ' +
  'var promise = cache.set(key, value)', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    cache.set(ctx, 'foo', 'bar')
    .then(function() {
      end(assert);
    }, function(err) {
      assert.err(err);
      end(assert);
    });
  });
});

test('Test get() of Go sample cache service - ' +
  'cache.get(key, value, callback)', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    cache.set(ctx, 'baz', 'qux', function(err, result) {
      assert.error(err);

      cache.get(ctx, 'baz', function(err, value) {
        assert.error(err);
        assert.equal(value, 'qux');
        end(assert);
      });
    });
  });
});

test('Test get() of Go sample cache service - ' +
  'var promise = cache.get(key, value)', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    cache.set(ctx, 'baz', 'qux')
    .then(function() {
      return cache.get(ctx, 'baz');
    })
    .then(function(value) {
      assert.equal(value, 'qux');
      end(assert);
    })
    .catch(function(err) {
      // I dont think this does what I think it does
      assert.error(err);
      end(assert);
    });
  });
});

test('Test get() with invalid key of Go sample cache service - ' +
  'cache.get(key, value, callback)', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    cache.get(ctx, 'is not a thing', function(err, value) {
      assert.ok(err instanceof NoExistError, 'should error');
      end(assert);
    });
  });
});

test('Test get() with invalid key of Go sample cache service - ' +
  'var promise = cache.get(key, value) - failure', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    cache
    .get(ctx, 'really not a thing')
    .then(function() {
      assert.fail('should not succeed');
      end(assert);
    })
    .catch(function(err) {
      assert.ok(err instanceof NoExistError, 'should error');
      end(assert);
    });
  });
});

test('Test calling a non-existing method of Go sample cache service - ' +
  'cache.badMethod()', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    assert.throws(function() {
      cache.notEvenAThing('whatever');
    });

    end(assert);
  });
});

test('Test multiGet() streaming method of Go sample cache service - ' +
  'var stream = cache.multiGet().stream', function(assert) {
  service('test_service/cache', function(err, ctx, cache, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }

    // `cache.mutliGet()` returns an object that has a "stream" attribute.
    // The way the streaming interface is implmented for cache.mutliGet()
    // is that you use stream.write(key) to get the value of a key. The value
    // is emitted on the stream's data event. In this test there are a few
    //  steps to set this up:
    //
    // * Prime the cache by setting a bunch of key/values
    // * Add a listener or create a stream reader to recieve the values
    // * Assert the values are correct
    // * End the stream.

    // Build a map of items
    var items = {};
    for (var i = 0; i < 10; ++i) {
      items[i] = {
        key: i,
        value: 'next value: ' + i
      };
    }

    // Add them to the cache
    var jobs = Object.keys(items).map(function(key) {
      return cache.set(ctx, key, JSON.stringify(items[key]));
    });

    Promise
    .all(jobs)
    .then(function() {
      var promise = cache.multiGet(ctx);
      var stream = promise.stream;

      // Error handling boilerplate
      promise.catch(error);
      stream.on('error', error);

      // "data" event emits cached values
      stream.on('data', function(value) {
        var string = value.toString();
        var json = JSON.parse(string);
        var actual = json.value;
        var expected = items[json.key].value;

        assert.equal(actual, expected);
      });

      stream.on('end', function() {
        end(assert);
      });

      Object.keys(items).forEach(function(key) {
        stream.write(key);
      });

      stream.end();
    });

    function error(err) {
      assert.error(err);
      end(assert);
    }
  });
});

test('Test getting signature of Go sample cache service - ' +
  'var promise = client.signature(ctx, test_service/cache)', function(assert) {
  veyron.init(config)
  .then(function(runtime) {
    var ctx = runtime.getContext();
    var client = runtime.newClient();
    client.signature(ctx, 'test_service/cache')
    .then(function(sigs) {
      assert.ok(sigs, 'received something');
      assert.ok(Array.isArray(sigs), 'receives a signature array');
      runtime.close(assert.end);
    }).catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  }).catch(assert.end);
});

test('Test getting signature of Go sample cache service - ' +
  'client.signature(ctx, test_service/cache, callback)', function(assert) {
  veyron.init(config, function(err, runtime) {
    if(err) {
      assert.end(err);
    }

    var ctx = runtime.getContext();
    var client = runtime.newClient();
    client.signature(ctx, 'test_service/cache', function(err, sigs) {
      assert.error(err);
      assert.ok(sigs, 'received something');
      assert.ok(Array.isArray(sigs), 'receives a signature array');
      runtime.close(assert.end);
    });
  });
});
