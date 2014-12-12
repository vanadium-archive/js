var test = require('prova');
var serve = require('./serve');
var veyron = require('../../');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
var Promise = require('../../src/lib/promise');
var context = require('../../src/runtime/context');
var idl = {
  package: 'foo',
  Cache: {
    set: {
      numInArgs: 2,
      numOutArgs: 0,
      inputStreaming: false,
      outputStreaming: false
    },
    get: {
      numInArgs: 1,
      numOutArgs: 1,
      inputStreaming: false,
      outputStreaming: false
    },
    multiGet: {
      numInArgs: 0,
      numOutArgs: 1,
      inputStreaming: true,
      outputStreaming: true
    },
  }
};

run({
  testName: 'with IDL using callbacks',
  definition: require('./cache-service'),
  idl: idl,
  name: 'foo.Cache',
});

run({
  testName: 'with IDL using promises',
  definition: require('./cache-service-promises'),
  idl: idl,
  name: 'foo.Cache'
});

run({
  testName: 'using callbacks',
  definition: require('./cache-service')
});

run({
  testName: 'using promises',
  definition: require('./cache-service-promises'),
});

run({
  testName: 'with IDL using callbacks, no contexts',
  definition: require('./cache-service'),
  idl: idl,
  name: 'foo.Cache',
  noCtx: true
});

run({
  testName: 'with IDL using promises without contexts',
  definition: require('./cache-service-promises'),
  idl: idl,
  name: 'foo.Cache',
  noCtx: true
});

run({
  testName: 'using callbacks without contexts',
  definition: require('./cache-service'),
  noCtx: true
});

run({
  testName: 'using promises without contexts',
  definition: require('./cache-service-promises'),
  noCtx: true
});

// options: defnition, idl, name, testName
function run(options) {

  var ctx = null;
  if (!options.noCtx) {
    ctx = context.Context();
  }

  var setup = function(t, callback) {
    var optArg;
    if (options.idl) {
      optArg = options.idl[options.name];
    } else {
      optArg = {
        set:{
          numReturnArgs: 0
        }
      };
    }
    var dispatcher = leafDispatcher(options.definition, optArg);
    serve(ctx, 'testing/cache', dispatcher, function(err, res) {
      if (err) {
        return t.end(err);
      }

      callback(res.service, res);
    });
  };

  var namePrefix = 'Test JS client/server ipc ' + options.testName + ' - ';

  test(namePrefix + 'cache.set("foo", "bar") -> cache.get("foo")',
    function(t) {
    setup(t, function(cache, res) {
      if (ctx) {
        cache.set(ctx, 'foo', 'bar',
          onSet.bind(null, t, cache, res, 'foo', 'bar'));
      } else {
        cache.set('foo', 'bar',
          onSet.bind(null, t, cache, res, 'foo', 'bar'));
      }
    });
  });

  test(namePrefix + 'cache.set("myObject", object, callback)', function(t) {
    setup(t, function(cache, res) {
      var expected = new Map([['a', 'foo'], ['b', 2]]);
      if (ctx) {
        cache.set(ctx, 'myObject', expected,
                  onSet.bind(null, t, cache, res, 'myObject', expected));
      } else {
        cache.set('myObject', expected,
                  onSet.bind(null, t, cache, res, 'myObject', expected));
      }
    });
  });

  test(namePrefix + 'cache.get("bad-key", callback) - failure', function(t) {
    setup(t, function(cache, res) {
      var onGet = function(err, result) {
        t.ok(err, 'should error');
        t.deepEqual(err.idAction, veyron.errors.IdActions.Unknown);
        res.end(t);
      };
      if (ctx) {
        cache.get(ctx, 'bad-key', onGet);
      } else {
        cache.get('bad-key', onGet);
      }
    });
  });

  test(namePrefix + 'cache.badMethod() - failure', function(t) {
    setup(t, function(cache, res) {
      t.throws(function() {
        cache.badMethod();
      });
      res.end(t);
    });
  });

  test(namePrefix + 'cache.multiGet()', function(t) {
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
    setup(t, function(cache, res){
      // Build a map of items
      var items = {};
      for (var i = 0; i < 10; ++i) {
        items[i] = {
          key: i,
          value: 'random value: ' + Math.random()
        };
      }

      // Add them to the cache
      var jobs = Object.keys(items).map(function(key) {
        if (ctx) {
          return cache.set(ctx, key, JSON.stringify(items[key]));
        } else {
          return cache.set(key, JSON.stringify(items[key]));
        }
      });

      Promise
      .all(jobs)
      .then(function() {
        var promise;
        if (ctx) {
          promise = cache.multiGet(ctx);
        } else {
          promise = cache.multiGet();
        }
        var stream = promise.stream;
        var writes = 0;
        var reads = 0;

        // Error handling boilerplate
        promise.catch(error);
        stream.on('error', error);

        // "data" event emits cached values
        stream.on('data', function(value) {
          var string = value.toString();
          var json = JSON.parse(string);
          var actual = json.value;
          var expected = items[json.key].value;

          t.equal(actual, expected);

          reads++;
        });

        stream.on('end', function() {
          t.equal(writes, reads);
          res.end(t);
        });

        Object.keys(items).forEach(function(key) {
          stream.write(key);

          writes++;
        });

        stream.end();
      });

      function error(err) {
        t.error(err);
        res.end(t);
      }
    });
  });

  function onSet(t, cache, res, key, value, err, result) {
    t.error(err);

    var onGet = function(expected, err, value) {
      t.error(err);
      t.deepEqual(value, expected);
      res.end(t);
    };

    // should be void result as defined in the optArg above
    t.deepEqual(result, []);
    if (ctx) {
      cache.get(ctx, key, onGet.bind(null, value));
    } else {
      cache.get(key, onGet.bind(null, value));
    }
  }
}
