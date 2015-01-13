var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
//var Promise = require('../../src/lib/promise');
var Deferred = require('../../src/lib/deferred');
var vom = require('vom');
var veyron = require('../../');

var context = require('../../src/runtime/context');

// TODO(bprosnitz) Combine CacheService and CacheServicePromises so there
// isn't as much duplicated code.

var CacheService = {
  cacheMap: {},
  set: function(context, key, value, cb) {
    if (value instanceof Map) {
      // TODO(bprosnitz) Remove the type here.
      // This is temporary because we currently guess map[any]any
      // which is illegal.
      var mapType = {
        kind: vom.Kind.MAP,
        key: vom.Types.STRING,
        elem: vom.Types.ANY
      };

      Object.defineProperty(value, '_type', {
        value: mapType
      });
    }

    this.cacheMap[key] = value;

    process.nextTick(function() {
      cb();
    });
  },
  get: function(context, key, cb) {
    var val = this.cacheMap[key];
    if (val === undefined) {
      var message = 'unknown key ' + JSON.stringify(key);
      var err = new Error(message);

      process.nextTick(function() {
        cb(err);
      });
    } else {
      process.nextTick(function() {
        cb(undefined, val);
      });
    }
  } ,
  // TODO(bprosnitz) Also test streaming with no return arg.
  multiGet: function(context, $stream, cb) {
    var numReceived = 0;
    $stream.on('end', function close() {
      cb(null, numReceived);
    });
    $stream.on('error', function error(e) {
      cb(e);
    });
    var self = this;
    $stream.on('data', function(key) {
      numReceived++;
      if (key !== null) {
        var val = self.cacheMap[key];
        if (val === undefined) {
          cb(new Error('unknown key'));
        }
        $stream.write(val);
      }
    });
    $stream.read();
  },
  doNothingStream: function(ctx, $stream) {
  },
  nonAsyncFunction: function(ctx) {
    return 'RESULT';
  }
};

var CacheServicePromises = {
  cacheMap: {},
  set: function(context, key, value) {
    if (value instanceof Map) {
      // TODO(bprosnitz) Remove the type here.
      // This is temporary because we currently guess map[any]any
      // which is illegal.
      var mapType = {
          kind: vom.Kind.MAP,
          key: vom.Types.STRING,
          elem: vom.Types.ANY
        };
      Object.defineProperty(value, '_type', {
        value: mapType
      });
    }

    this.cacheMap[key] = value;
  },
  get: function(context, key) {
    var def = new Deferred();
    var val = this.cacheMap[key];
    if (val === undefined) {
      def.reject('unknown key');
    } else {
      def.resolve(val);
    }
    return def.promise;
  } ,
  multiGet: function(context, $stream) {
    var numReceived = 0;
    var def = new Deferred();
    $stream.on('end', function() {
      def.resolve(numReceived);
    });

    $stream.on('error', function(e) {
      def.reject(e);
    });
    var self = this;
    $stream.on('data', function(key) {
      numReceived++;
      if (key !== null) {
        var val = self.cacheMap[key];
        if (val === undefined) {
          def.reject('unknown key');
        }
        $stream.write(val);
      }
    });
    $stream.read();
    return def.promise;
  },
  doNothingStream: function(ctx, $stream) {
  },
  nonAsyncFunction: function(ctx) {
    return 'RESULT';
  }
};

// TODO(bprosnitz) After we make it simpler to provide VDL type information,
// add more test cases with types.

run({
  testName: 'without VDL using callbacks',
  definition: CacheService,
  name: 'foo.Cache'
});

run({
  testName: 'without VDL using promises',
  definition: CacheServicePromises,
  name: 'foo.Cache'
});

// options: testName, definition, name
function run(options) {
  var ctx = context.Context();
  var namePrefix = 'Test JS client/server ipc ' + options.testName + ' - ';

  test(namePrefix + 'cache.set(key, string) -> cache.get(key)', function(t) {
    setup(options, function(err, cache, end) {
      t.error(err, 'should not error on setup');

      cache.set(ctx, 'foo', 'bar', function(err, res) {
        t.error(err, 'should not error on set(...)');
        t.notOk(res, 'should be null');

        cache.get(ctx, 'foo', function(err, res) {
          t.error(err, 'should not error on get(...)');
          t.equal(res, 'bar');
          end(t);
        });
      });
    });
  });

  test(namePrefix + 'cache.set(key, object, callback)', function(t) {
    setup(options, function(err, cache, end) {
      t.error(err, 'should not error on setup');

      // TODO(bprosnitz) Remove the type here.
      // This is temporary because we currently guess map[any]any
      // which is illegal.
      var expected = new Map([['a', 'foo'], ['b', 2]]);
      var mapType = {
        kind: vom.Kind.MAP,
        key: vom.Types.STRING,
        elem: vom.Types.ANY
      };

      Object.defineProperty(expected, '_type', {
        value: mapType
      });

      cache.set(ctx, 'myObject', expected, function(err, res) {
        t.error(err, 'should not error on set(...)');
        t.equal(res, null, 'should be null');

        cache.get(ctx, 'myObject', function(err, res) {
          t.error(err, 'should not error on get(...)');
          t.deepEqual(res, expected);
          end(t);
        });
      });
    });
  });

  test(namePrefix + 'cache.get("bad-key", callback) - failure', function(t) {
    setup(options, function(err, cache, end) {
      t.error(err, 'should not error on setup');

      cache.get(ctx, 'bad-key', function(err, res) {
        t.ok(err, 'should not err on get(...)');
        // TODO(bprosnitz) Fix this when we update to the new verror.
        delete err.idAction.iD;
        t.deepEqual(err.idAction, veyron.errors.IdActions.Unknown);
        end(t);
      });
    });
  });

  test(namePrefix + 'cache.badMethod() - failure', function(t) {
    setup(options, function(err, cache, end) {
      t.error(err, 'should not error on setup');

      t.throws(function() {
        cache.badMethod();
      });

      end(t);
    });
  });

  test(namePrefix + 'cache.multiGet()', function(t) {
    // `cache.multiGet()` returns an object that has a "stream" attribute.
    // The way the streaming interface is implmented for cache.mutliGet()
    // is that you use stream.write(key) to get the value of a key. The value
    // is emitted on the stream's data event. In this test there are a few
    //  steps to set this up:
    //
    // 1. Prime the cache by setting a bunch of key/values
    // 2. Add a listener or create a stream reader to recieve the values
    // 3. Assert the values are correct
    // 4. End the stream.
    setup(options, function(err, cache, end){
      // 1. Prime the cache by setting a bunch of key/values

      // Build a map of items
      var items = {};
      var numItems = 3;

      for (var i = 0; i < numItems; ++i) {
        items[i] = {
          key: i,
          value: 'value: ' + i
        };
      }

      // Add them to the cache
      var jobs = Object.keys(items).map(function(key) {
        return cache.set(ctx, key, JSON.stringify(items[key]));
      });

      Promise
      .all(jobs)
      .then(function() {

        // 2. Add a listener or create a stream reader to recieve the values
        var promise = cache.multiGet(ctx);
        var stream = promise.stream;
        var writes = 0;
        var reads = 0;

        // Error handling boilerplate
        promise.then(function(numReceived) {
          t.equal(numReceived, numItems, 'received correct number of items');
          t.equal(reads, numItems, 'had correct number of reads');
          t.equal(writes, numItems, 'has correct number of writes');
          end(t);
        }).catch(error);

        stream.on('error', error);

        // 3. Assert the values are correct
        // stream "data" event emits cached values
        stream.on('data', function(value) {
          var string = value.toString();
          var json = JSON.parse(string);
          var actual = json.value;
          var expected = items[json.key].value;

          t.equal(actual, expected);

          reads++;
        });

        /*
        //TODO(bprosnitz) We get a double end with the stream end.
        //Fix this with Prova.
        stream.on('end', function() {
          t.equal(writes, reads);
          res.end(t);
        });
        */

        Object.keys(items).forEach(function(key) {
          stream.write(key);

          writes++;
        });

        // 4. End the stream.
        stream.end();
      });

      function error(err) {
        t.error(err, 'should not error');
        end(t);
      }
    });
  });

  function setup(options, cb) {
    var serveCtx = context.Context();
    var dispatcher = leafDispatcher(options.definition);

    serve(serveCtx, 'testing/cache', dispatcher, function(err, res) {
      cb(err, res.service, res.end);
    });
  }
}
