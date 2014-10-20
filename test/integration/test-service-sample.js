var test = require('prova');
var veyron = require('../../');
var service = require('./get-service');
var VeyronError = veyron.errors.VeyronError;
var Promise = require('bluebird');

test('cache.set(key, value, callback)', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

    cache.set('foo', 'bar', function(err, result) {
      assert.error(err);
      end(assert);
    });
  });
});

test('var promise = cache.set(key, value)', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

    cache.set('foo', 'bar')
    .then(function() {
      end(assert);
    }, function(err) {
      assert.err(err);
      end(assert);
    });
  });
});

test('cache.get(key, value, callback)', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

    cache.set('baz', 'qux', function(err, result) {
      assert.error(err);

      cache.get('baz', function(err, value) {
        assert.error(err);
        assert.equal(value, 'qux');
        end(assert);
      });
    });
  });
});

test('cache.get(key, value, callback) - failure', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

    cache.get('is not a thing', function(err, value) {
      assert.ok(err instanceof VeyronError, 'should error');
      end(assert);
    });
  });
});


test('var promise = cache.get(key, value)', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

    cache.set('baz', 'qux')
    .then(function() {
      return cache.get('baz');
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

test('var promise = cache.get(key, value) - failure', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

    cache
    .get('really not a thing')
    .then(function() {
      assert.fail('should not succeed');
      end(assert);
    })
    .catch(function(err) {
      assert.ok(err instanceof VeyronError, 'should error');
      end(assert);
    });
  });
});

test('cache.badMethod() - exception', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

    assert.throws(function() {
      cache.notEvenAThing('whatever');
    });

    end(assert);
  });
});

test('var stream = cache.multiGet().stream', function(assert) {
  service('sample/cache', function(err, cache, end) {
    assert.error(err);

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
      return cache.set(key, JSON.stringify(items[key]));
    });

    Promise
    .all(jobs)
    .then(function() {
      var promise = cache.multiGet();
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
