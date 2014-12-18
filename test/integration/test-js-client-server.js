var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
//var Promise = require('../../src/lib/promise');
var Deferred = require('../../src/lib/deferred');
var vom = require('vom');

var multiGetTestRunCount = 0;

// TODO(bprosnitz) Combine CacheService and CacheServicePromises so there
// isn't as much duplicated code.

var CacheService = {
  cacheMap: {},
  set: function(key, value) {
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
  get: function(key, $cb) {
    var val = this.cacheMap[key];
    if (val === undefined) {
      $cb('unknown key ' + JSON.stringify(key));
    } else {
      $cb(undefined, val);
    }
  } ,
  // TODO(bprosnitz) Also test streaming with no return arg.
  multiGet: function($cb, $stream) {
    var numReceived = 0;
    $stream.on('end', function close() {
      $cb(null, numReceived);
    });
    $stream.on('error', function error(e) {
      $cb(e);
    });
    var self = this;
    $stream.on('data', function(key) {
      numReceived++;
      if (key !== null) {
        var val = self.cacheMap[key];
        if (val === undefined) {
          $cb(new Error('unknown key'));
        }
        $stream.write(val);
      }
    });
    $stream.read();
  },
  doNothingStream: function($stream) {
  },
  nonAsyncFunction: function() {
    return 'RESULT';
  }
};

var CacheServicePromises = {
  cacheMap: {},
  set: function(key, value) {
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
  get: function(key) {
    var def = new Deferred();
    var val = this.cacheMap[key];
    if (val === undefined) {
      def.reject('unknown key');
    } else {
      def.resolve(val);
    }
    return def.promise;
  } ,
  multiGet: function($stream) {
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
  doNothingStream: function($stream) {
  },
  nonAsyncFunction: function() {
    return 'RESULT';
  }
};

var context = require('../../src/runtime/context');

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

  var setup = function(t, cb) {
    var serveCtx = context.Context();
    var dispatcher = leafDispatcher(options.definition);
    serve(serveCtx, 'testing/cache', dispatcher, function(err, res) {
      if (err) {
        return t.end(err);
      }
      cb(res.service, res);
    });
  };

  var ctx = context.Context();


  var namePrefix = 'Test JS client/server ipc ' + options.testName + ' - ';

 test(namePrefix + 'cache.set("foo", "bar") -> cache.get("foo")',
    function(t) {
    setup(t, function(cache, res) {
      cache.set(ctx, 'foo', 'bar',
        onSet.bind(null, t, cache, res, 'foo', 'bar'));
    });
  });

  test(namePrefix + 'cache.set("myObject", object, callback)', function(t) {
    setup(t, function(cache, res) {
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
      cache.set(ctx, 'myObject', expected,
        onSet.bind(null, t, cache, res, 'myObject', expected));
    });
  });

  test(namePrefix + 'cache.get("bad-key", callback) - failure', function(t) {
    setup(t, function(cache, res) {
      var onGet = function(err, result) {
        t.ok(err, 'should error');
        // TODO(bprosnitz) Fix this when we update to the new verror.
        //t.deepEqual(err.idAction, veyron.errors.IdActions.Unknown);
        t.equals(err.idAction.action, 0);
        t.equals(err.idAction.id, 'veyron.io/veyron/veyron2/verror.Unknown');
        res.end(t);
      };
      cache.get(ctx, 'bad-key', onGet);
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
      // `cache.multiGet()` returns an object that has a "stream" attribute.
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
      var numItems = 3;
      multiGetTestRunCount++;
      for (var i = 0; i < numItems; ++i) {
        items[i] = {
          key: i,
          value: 'value: ' + (i + multiGetTestRunCount * 1000)
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
        var writes = 0;
        var reads = 0;

        // Error handling boilerplate
        promise.then(function(numReceived) {
          t.equal(numReceived, numItems, 'received correct number of items');
          t.equal(reads, numItems, 'had correct number of reads');
          t.equal(writes, numItems, 'has correct number of writes');
          res.end(t);
        }).catch(error);
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
    t.deepEqual(result, null);
    cache.get(ctx, key, onGet.bind(null, value));
  }
}
