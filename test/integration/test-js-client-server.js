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

test('js client/server', function(t) {
  t.test('with IDL using callbacks', function(t) {
    run({
      definition: require('./cache-service'),
      idl: idl,
      name: 'foo.Cache',
      t: t
    });
  });

  t.test('with IDL using promises', function(t) {
    run({
      definition: require('./cache-service-promises'),
      idl: idl,
      name: 'foo.Cache',
      t: t
    });
  });

  t.test('server using callbacks', function(t) {
    run({
      definition: require('./cache-service'),
      t: t
    });
  });

  t.test('server using promises', function(t) {
    run({
      definition: require('./cache-service-promises'),
      t: t
    });
  });

  t.test('with IDL using callbacks, no contexts', function(t) {
    run({
      definition: require('./cache-service'),
      idl: idl,
      name: 'foo.Cache',
      t: t,
      noCtx: true
    });
  });

  t.test('with IDL using promises, no contexts', function(t) {
    run({
      definition: require('./cache-service-promises'),
      idl: idl,
      name: 'foo.Cache',
      t: t,
      noCtx: true
    });
  });

  t.test('server using callbacks, no contexts', function(t) {
    run({
      definition: require('./cache-service'),
      t: t,
      noCtx: true
    });
  });

  t.test('server using promises, no contexts', function(t) {
    run({
      definition: require('./cache-service-promises'),
      t: t,
      noCtx: true
    });
  });
});

// optopns: defnition, idl, name, assert
function run(options) {
  // the assert needs to be passed in so it's tied to the original test
  // and can signal when all the async work is done.
  var t = options.t;

  if (! t) {
    throw new Error('requires options.t to run assertions');
  }

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

  var ctx = null;
  if (!options.noCtx) {
    ctx = context.Context();
  }
  serve(ctx, 'testing/cache', dispatcher, function(err, res) {
    t.error(err);

    // waits to close the runtime until all the child tests have ended.
    t.on('end', function() {
      res.end(t);
    });

    var cache = res.service;
    
    var onGet = function(t, expected, err, value) {
      t.error(err);
      t.deepEqual(value, expected);
      console.log('ending...');
      t.end();
    };
    
    var onSet = function(t, key, value, err, result) {
      t.error(err);
      
      // should be void result as defined in the optArg above
      t.deepEqual(result, []);
      if (ctx) {
        cache.get(ctx, key, onGet.bind(null, t, value));
      } else {
        cache.get(key, onGet.bind(null, t, value));
      }
    };

    t.test('cache.set("foo", "bar") -> cache.get("foo")', function(t) {
      if (ctx) {
        cache.set(ctx, 'foo', 'bar', onSet.bind(null, t, 'foo', 'bar'));
      } else {
        cache.set('foo', 'bar', onSet.bind(null, t, 'foo', 'bar'));
      }
    });

    t.test('cache.set("myObject", object, callback)', function(t) {
      var expected = new Map([['a', 'foo'], ['b', 2]]);
      if (ctx) {
        cache.set(ctx, 'myObject', expected,
                  onSet.bind(null, t, 'myObject', expected));
      } else {
        cache.set('myObject', expected, 
                  onSet.bind(null, t, 'myObject', expected));
      }
    });

    t.test('cache.get("bad-key", callback) - failure', function(t) {
      var onGet = function(err, result) {
        t.ok(err, 'should error');
        t.deepEqual(err.idAction, veyron.errors.IdActions.Unknown);
        t.end();
      };
      if (ctx) {
        cache.get(ctx, 'bad-key', onGet);
      } else {
        cache.get('bad-key', onGet);
      }
    });

    t.test('cache.badMethod() - failure', function(t) {
      t.throws(function() {
        cache.badMethod();
      });
      t.end();
    });

    t.test('cache.multiGet()', function(t) {
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
          t.end();
        });

        Object.keys(items).forEach(function(key) {
          stream.write(key);

          writes++;
        });

        stream.end();
      });

      function error(err) {
        t.error(err);
        t.end();
      }
    });
  });
}
