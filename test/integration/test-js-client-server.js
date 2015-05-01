// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var Deferred = require('../../src/lib/deferred');
var vdl = require('../../src/vdl');
var builtins = require('../../src/vdl/builtins');
var stringify = require('../../src/vdl/stringify');
var TypeUtil = require('../../src/vdl/type-util');
var typeServiceVdl =
  require('../vdl-out/javascript-test/services/type-service');
var typedStreamingServiceVdl =
  require('../vdl-out/javascript-test/services/typed-streaming-service');

// TODO(bprosnitz) Combine CacheService and CacheServicePromises so there
// isn't as much duplicated code.

var CacheService = {
  cacheMap: {},
  set: function(context, serverCall, key, value, cb) {
    this.cacheMap[key] = value;

    process.nextTick(function() {
      cb(null, undefined);
    });
  },
  get: function(context, serverCall, key, cb) {
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
  multiGet: function(context, serverCall, $stream, cb) {
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
  doNothingStream: function(ctx, serverCall, $stream, cb) {
    cb(null, undefined);
  },
  nonAsyncFunction: function(ctx, serverCall, cb) {
    cb(null, 'RESULT');
  }
};

var CacheServicePromises = {
  cacheMap: {},
  set: function(context, serverCall, key, value) {
    this.cacheMap[key] = value;
  },
  get: function(context, serverCall, key) {
    var def = new Deferred();
    var val = this.cacheMap[key];
    process.nextTick(function() {
      if (val === undefined) {
        // Since we're rejecting the promise before we've returned it
        // we'll register a catch handler now to avoid an unhandled rejection
        // warning.
        def.promise.catch(function() {});
        def.reject('unknown key');
      } else {
        def.resolve(val);
      }
    });
    return def.promise;
  } ,
  multiGet: function(context, serverCall, $stream) {
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
  doNothingStream: function(ctx, serverCall, $stream) {
  },
  nonAsyncFunction: function(ctx, serverCall) {
    return 'RESULT';
  }
};

runCache({
  testName: 'without VDL (JSValue) using callbacks',
  definition: CacheService,
  name: 'foo.Cache'
});

runCache({
  testName: 'without VDL (JSValue) using promises',
  definition: CacheServicePromises,
  name: 'foo.Cache'
});

// options: testName, definition, name
function runCache(options) {
  var namePrefix = 'Test JS client/server rpc ' + options.testName + ' - ';

  test(namePrefix + 'cache.set(key, string) -> cache.get(key)',
            function(t) {
    setup(options, function(err, ctx, cache, end) {
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
    setup(options, function(err, ctx, cache, end) {
      t.error(err, 'should not error on setup');

      // Expect a map as the JSValue.
      var expected = new Map([['a', 'foo'], ['b', 2]]);

      cache.set(ctx, 'myObject', expected, function(err, res) {
        t.error(err, 'should not error on set(...)');
        t.equal(res, null, 'should be null');

        cache.get(ctx, 'myObject', function(err, res) {
          t.error(err, 'should not error on get(...)');
          t.deepEqual(res, expected, 'should match object');
          end(t);
        });
      });
    });
  });

  test(namePrefix + 'cache.get("bad-key", callback) - failure',
            function(t) {
    setup(options, function(err, ctx, cache, end) {
      t.error(err, 'should not error on setup');

      cache.get(ctx, 'bad-key', function(err, res) {
        t.ok(err, 'should err on get(...)');
        // TODO(bjornick): Use the constant generated by the vdl generator.
        t.equal(err.id, 'v.io/v23/verror.Unknown');
        end(t);
      });
    });
  });

  test(namePrefix + 'cache.badMethod() - failure', function(t) {
    setup(options, function(err, ctx, cache, end) {
      t.error(err, 'should not error on setup');

      t.throws(function() {
        cache.badMethod();
      });

      end(t);
    });
  });

  test(namePrefix + 'cache.multiGet()', function(t) {
    // `cache.multiGet()` returns an object that has a "stream" attribute.
    // The way the streaming interface is implmented for cache.multiGet()
    // is that you use stream.write(key) to get the value of a key. The value
    // is emitted on the stream's data event. In this test there are a few
    //  steps to set this up:
    //
    // 1. Prime the cache by setting a bunch of key/values
    // 2. Add a listener or create a stream reader to receive the values
    // 3. Assert the values are correct
    // 4. End the stream.
    setup(options, function(err, ctx, cache, end){
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

        // 2. Add a listener or create a stream reader to receive the values
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
    var dispatcher = leafDispatcher(options.definition);
    serve('testing/cache', dispatcher, function(err, res) {
      cb(err, res.runtime.getContext(), res.service, res.end);
    });
  }
}

function TypeService() {}
TypeService.prototype = new typeServiceVdl.TypeService();

TypeService.prototype.isTyped =  function(context, serverCall, any) {
  // We expect to receive the internally typed value of the any.
  // However, clients who send JSValue will not produce a typed value here.
  return TypeUtil.isTyped(any);
};
TypeService.prototype.isString = function(context, serverCall, str) {
  // We expect to receive a native string, if the client sent us one.
  return (typeof str === 'string');
};
TypeService.prototype.isStruct = function(context, serverCall, struct) {
  // A struct should always be typed.
  if (TypeUtil.isTyped(struct)) {
    return;
  }
  // If it was untyped (a JSValue object), then the code is incorrect.
  throw new Error('did not receive a typed struct' + stringify(struct));
};
TypeService.prototype.swap = function(context, serverCall, a, b) {
  return [b, a];
};

runTypeService({
  testName: 'typed, non-async',
  definition: new TypeService(),
  name: 'foo.TypeService'
});

// options: testName, definition, name
function runTypeService(options) {
  var namePrefix = 'Test JS client/server rpc ' + options.testName + ' - ';
  // This test ensures that typed values are sent between JS server and client.
  // The server expects an input of the ANY type, which means that it ought to
  // receive a typed value, if we send a typed value.
  // If we send a JSValue, then it will not end up being wrapped.
  test(namePrefix + 'typeService.isTyped(...)', function(t) {
    setup(options, function(err, ctx, typeService, end) {
      t.error(err, 'should not error on setup');

      typeService.isTyped(ctx, 'foo', function(err, res) {
        t.error(err, 'should not error on isTyped(...)');
        // Use equal instead of notOk to ensure that res is not wrapped.
        t.equal(res, false, '\'foo\' is an untyped string');


        var VomStr = vdl.registry.lookupOrCreateConstructor(vdl.types.STRING);
        var typedString = new VomStr('food');
        typeService.isTyped(ctx, typedString, function(err, res) {
          t.error(err, 'should not error on isTyped(...)');
          // Use equal instead of ok to ensure that res is not wrapped.
          t.equal(res, true, 'VomStr(\'food\') is a typed string');
          end(t);
        });
      });
    });
  });

  // This test ensures that typed values sent between JS server and client are
  // unwrapped when being processed. Further, the client disallows sending the
  // wrong type to the server.
  test(namePrefix + 'typeService.isString(str)', function(t) {
    setup(options, function(err, ctx, typeService, end) {
      t.error(err, 'should not error on setup');

      typeService.isString(ctx, 'foo', function(err, res) {
        t.error(err, 'should not error on isString(<a string>)');
        // Use equal instead of ok to ensure that res is not wrapped.
        t.equal(res, true, '\'foo\' is a string');

        typeService.isString(ctx, 0, function(err, res) {
          t.ok(err, 'should error on isString(<not a string>)');
          end(t);
        });
      });
    });
  });

  // This test ensures that a typed struct has its type on the other side.
  // That would prove that it was not decoded as a JSValue.
  test(namePrefix + 'typeService.isStruct(struct)', function(t) {
    setup(options, function(err, ctx, typeService, end) {
      t.error(err, 'should not error on setup');

      typeService.isStruct(ctx, {}, function(err, res) {
        t.error(err, 'should not error on isStruct(...)');
        end(t);
      });
    });
  });

  // This test ensures that multiple typed I/O arguments are possible in JS.
  test(namePrefix + 'typeService.swap(a, b)', function(t) {
    setup(options, function(err, ctx, typeService, end) {
      t.error(err, 'should not error on setup');

      // Start by swapping JSValue. There are no types attached when returned.
      var a = '33';
      var b = 33;
      typeService.swap(ctx, a, b, function(err, res1, res2) {
        t.error(err, 'should not error on swap(...)');
        t.deepEqual([res1, res2], [b, a], 'correctly swapped the 2 inputs');

        // Now, swap a typed value (aa) with a wrapped and typed value (bb).
        var simpleType = {
          name: 'SimpleStruct',
          kind: vdl.kind.STRUCT,
          fields: [
            {
              name: 'Foo',
              type: vdl.types.INT32
            },
            {
              name: 'Bar',
              type: vdl.types.BOOL
            }
          ]
        };
        var SimpleStruct = vdl.registry.lookupOrCreateConstructor(simpleType);
        var aa = new SimpleStruct({
          foo: 10,
          bar: true
        });
        var simpleTypeB = vdl.types.INT32;
        var SimpleInt32 = vdl.registry.lookupOrCreateConstructor(simpleTypeB);
        var bb = new SimpleInt32(-32);
        typeService.swap(ctx, aa, bb, function(err, res1, res2) {
          t.error(err, 'should not error on swap(...)');
          t.deepEqual([res1, res2], [bb, aa], 'correctly swapped the 2 inputs');

          // Verify that res2 (the original aa) still has the right type.
          t.ok(TypeUtil.isTyped(res2), 'aa is still typed');
          t.deepEqual(res2._type, simpleType, 'aa has the correct type');

          // Verify that res1 (the original bb) still has the right type.
          t.ok(TypeUtil.isTyped(res1), 'bb is still typed');
          t.deepEqual(res1._type, simpleTypeB, 'bb has the correct type');

          end(t);
        });
      });
    });
  });

  function setup(options, cb) {
    var dispatcher = leafDispatcher(options.definition);

    serve('testing/typeService', dispatcher, function(err, res) {
      cb(err, res.runtime.getContext(), res.service, res.end);
    });
  }
}

var boolListType = typedStreamingServiceVdl.BoolList.prototype._type;
var numStructType = typedStreamingServiceVdl.NumStruct.prototype._type;
var typeListType = typedStreamingServiceVdl.TypeList.prototype._type;

// TODO(alexfandrianto): Add a callback version of the typed streaming service.
// See each test case for what the service method tests.
function TypedStreamingService() {}
TypedStreamingService.prototype =
  new typedStreamingServiceVdl.TypedStreamingService();

// inStreamOnly verifies that typed inStreams work properly.
TypedStreamingService.prototype.inStreamOnly =
  function(ctx, serverCall, numTimes, $stream) {

  // Receive stream values numTimes
  var numReceived = 0;
  var def = new Deferred();
  $stream.on('end', function() {
    if (numReceived !== numTimes) {
      var err = new Error('Got ' + numReceived + '. Wanted ' + numTimes);
      def.reject(err);
    }
    def.resolve(numReceived);
  });

  $stream.on('error', function(e) {
    def.reject(e);
  });
  $stream.on('data', function(str) {
    if (typeof str !== 'string') {
      def.reject(new Error('Expected a string, but got ' + str));
    }
    numReceived++;
  });
  $stream.read();
  $stream.write('No outstream type; this cannot be sent');
  return def.promise;
};

// outStreamOnly verifies that typed outStreams work properly.
TypedStreamingService.prototype.outStreamOnly =
  function(ctx, serverCall, numTimes, $stream, cb) {

  // Send stream values numTimes
  var numSent = 0;
  while (numSent < numTimes) {
    $stream.write(numSent); // Despite sending int, we autoconvert to BigInt.
    numSent++;
  }
  return cb(null, numSent);
};

// bidirBoolListNegationsStream tests that bidirectional streams can send
// composite types back and forth, as well as modify the data items streamed.
TypedStreamingService.prototype.bidirBoolListNegationStream =
  function(ctx, serverCall, $stream) {

  // Given a list of bool, send the opposite bools back.
  var numReceived = 0;
  var def = new Deferred();
  $stream.on('end', function() {
    def.resolve(numReceived);
  });

  $stream.on('error', function(e) {
    def.reject(e);
  });
  $stream.on('data', function(boolList) {
    numReceived++;
    var oppList = boolList.map(function(b) {
      return !b;
    });
    $stream.write(oppList);
  });
  $stream.read();
  return def.promise;
};

// structValueStream converts a number to a struct based on that number.
// Ensures that custom-defined types can be sent across the stream.
TypedStreamingService.prototype.structValueStream =
  function(ctx, serverCall, $stream) {

  // Given a number, send a number struct back.
  var numReceived = 0;
  var def = new Deferred();
  $stream.on('end', function() {
    def.resolve(numReceived);
  });
  $stream.on('error', function(e) {
    def.reject(e);
  });
  $stream.on('data', function(num) {
    numReceived++;
    $stream.write({
      'number': num,
      'bigInt': vdl.BigInt.fromNativeNumber(num),
      'string': '' + num
    });
  });
  $stream.read();
  return def.promise;
};

// anyStream tests that typed values can pass through a bidirectional stream.
TypedStreamingService.prototype.anyStream =
  function(ctx, serverCall, types, $stream) {

  // Given a list of types, listen to a stream of values.
  // Errors if any of the values received did not match their expected type.
  // Stream those values back directly.
  var typesReceived = [];
  var def = new Deferred();
  $stream.on('end', function() {
    def.resolve(typesReceived);
  });
  $stream.on('error', function(e) {
    def.reject(e);
  });
  $stream.on('data', function(val) {
    // Verify that the value has no type if native, or matches, otherwise.
    var expectedType = types[typesReceived.length];
    if (expectedType.equals(vdl.types.JSVALUE) && val._type !== undefined) {
      def.reject(new Error('Native value had a type: ' +
        JSON.stringify(val)));
    }
    if (!expectedType.equals(vdl.types.JSVALUE) &&
      !expectedType.equals(val._type)) {
      def.reject(new Error('Value had wrong type: ' +
        JSON.stringify(val)));
    }

    // The value had the corerct type. Write the same value back.
    // Note: Native values lack types, so use the JSValue type instead.
    typesReceived.push(val._type || vdl.types.JSVALUE);
    $stream.write(val);
  });
  $stream.read();
  return def.promise;
};

runTypedStreamingService({
  testName: 'typed, streaming, non-async',
  definition: new TypedStreamingService(),
  name: 'foo.TypedStreamingService'
});

// options: testName, definition, name
function runTypedStreamingService(options) {
  var namePrefix = 'Test JS client/server rpc ' + options.testName + ' - ';

  // typedStreamingService.inStreamOnly tests:
  // - correct # of values sent to server
  // - values received by server have correct type
  // - outStream is null
  // - client never gets data, even though server tries to send on outStream
  test(namePrefix + 'typedStreamingService.inStreamOnly(...)',
    function(t) {

    setup(options, function(err, ctx, typedStreamingService, end) {
      t.error(err, 'should not error on setup');

      // The # of strings we intend to send.
      var strList = ['asdf', ';lkj', 'qwer', 'poiu'];
      var numStrs = strList.length;

      // Prepare and run the stream test.
      var testdata = {
        inArg: numStrs,
        inData: strList,
        serviceMethod: typedStreamingService.inStreamOnly,
        writeType: vdl.types.STRING,
        readType: null,
        onResolveFunc: function(numReceived) {
          t.equal(numReceived, numStrs,
            'service received correct # of strings');
          end(t);
        },
        onDataFunc: function(value, dataIndex) {
          t.fail('received data from the stream: ' + JSON.stringify(value));
        }
      };
      streamTest(t, ctx, testdata, end);
    });
  });

  // This test verifies that the stream promise rejects normally.
  // We send 4 items, but we claim to the server that we will send 6.
  // Note: the stream also passes the same reject error to the error stream.
  test(namePrefix + 'typedStreamingService.inStreamOnly(...) - failure',
    function(t) {

    setup(options, function(err, ctx, typedStreamingService, end) {
      t.error(err, 'should not error on setup');

      // The # of strings we intend to send.
      var strList = ['asdf', ';lkj', 'qwer', 'poiu'];
      var numStrs = strList.length + 2; // mismatch

      // The stream will send an error on the error stream just before the
      // Promise rejects.
      var onErrorFunc = function(err) {
        t.ok(err, 'should error');
        t.ok(err.message.indexOf('Got 4. Wanted 6') !== -1,
          'has correct error message');
      };

      // Prepare and run the stream test.
      var testdata = {
        inArg: numStrs,
        inData: strList,
        serviceMethod: typedStreamingService.inStreamOnly,
        writeType: vdl.types.STRING,
        readType: null,
        onResolveFunc: function(numReceived) {
          t.fail('should have errored; did not send correct # of strings');
          end(t);
        },
        onDataFunc: function(value, dataIndex) {
          t.fail('received data from the stream: ' + JSON.stringify(value));
        },
        onErrorFunc: onErrorFunc,
        onRejectFunc: function(err) {
          onErrorFunc(err);
          end(t);
        }
      };
      streamTest(t, ctx, testdata, end);
    });
  });

  // This test verifies that the client cannot send a bad type onto the stream.
  // It also verifies that this bad value is not sent to the server.
  // Thus, the promise rejects, and the client gets an error while attempting to
  // write the bad value (write an int instead of a string).
  // Note: the stream also passes the same reject error to the error stream.
  test(namePrefix + 'typedStreamingService.inStreamOnly(...) - failure 2',
    function(t) {

    setup(options, function(err, ctx, typedStreamingService, end) {
      t.error(err, 'should not error on setup');

      // The # of strings we intend to send.
      var strList = [6];
      var numStrs = strList.length;

      // The stream will send an error on the error stream just before the
      // Promise rejects.
      var onErrorFunc = function(err) {
        t.ok(err, 'should error');
        t.ok(err.message.indexOf('Got 0. Wanted 1') !== -1,
          'has correct error message');
      };

      // Prepare and run the stream test.
      var testdata = {
        inArg: numStrs,
        inData: strList,
        serviceMethod: typedStreamingService.inStreamOnly,
        writeType: vdl.types.STRING,
        readType: null,
        onResolveFunc: function(numReceived) {
          t.fail('should have errored; sent an int');
          end(t);
        },
        onDataFunc: function(value, dataIndex) {
          t.fail('received data from the stream: ' + JSON.stringify(value));
        },
        inDataThrowRegexp: /.*cannot convert to string.*/,
        onErrorFunc: onErrorFunc,
        onRejectFunc: function(err) {
          onErrorFunc(err);
          end(t);
        }
      };
      streamTest(t, ctx, testdata, end);
    });
  });

  // typedStreamingService.outStreamOnly tests:
  // - correct # of values read and outputted
  // - values received by server have the correct type
  // - inStream is null
  test(namePrefix + 'typedStreamingService.outStreamOnly(...)', function(t) {

    setup(options, function(err, ctx, typedStreamingService, end) {
      t.error(err, 'should not error on setup');

      // The # of BigInts we want to receive and # received so far.
      var numInts = 3;
      var numOutStream = 0;

      // Prepare and run the stream test.
      var testdata = {
        inArg: numInts,
        inData: [],
        serviceMethod: typedStreamingService.outStreamOnly,
        writeType: null,
        readType: vdl.types.INT64,
        onResolveFunc: function(numSent) {
          t.equal(numSent, numInts, 'service knows # of values sent');
          t.equal(numOutStream, numInts, 'service sent correct # of values');
          end(t);
        },
        onDataFunc: function(value, dataIndex) {
          t.ok(value instanceof vdl.BigInt, 'value is a BigInt');
          numOutStream++;
        }
      };
      streamTest(t, ctx, testdata, end);
    });
  });

  // typedStreamingService.bidirBoolListNegationStream tests:
  // - custom defined type (simple) can be sent and received properly
  // - the values can be modified and returned (each bool is negated)
  test(namePrefix + 'typedStreamingService.bidirBoolListNegationStream()',
    function(t) {

    setup(options, function(err, ctx, typedStreamingService, end){
      t.error(err, 'should not error on setup');

      // These are the testcases.
      var boolLists = [
        undefined,          // Note: undefined autoconverts to empty list.
        [],
        [true],
        [false, true, true],
        [undefined, false], // Note: undefined autoconverts to false.
      ];
      var expectedLists = [
        [],
        [],
        [false],
        [true, false, false],
        [true, true]
      ];

      // Prepare and run the stream test.
      var testdata = {
        inArg: undefined,
        inData: boolLists,
        serviceMethod: typedStreamingService.bidirBoolListNegationStream,
        writeType: boolListType,
        readType: boolListType,
        onResolveFunc: function(numReceived) {
          t.deepEqual(numReceived, boolLists.length,
            'service sent correct # of values');
          end(t);
        },
        onDataFunc: function(actual, dataIndex) {
          t.ok(Array.isArray(actual), 'value is an array');
          t.deepEqual(actual, expectedLists[dataIndex],
            'bools were flipped');
        }
      };
      streamTest(t, ctx, testdata, end);
    });
  });

  // typedStreamingService.structValueStream tests:
  // - values with a named struct type can be received properly
  test(namePrefix + 'typedStreamingService.structValueStream()', function(t) {
    setup(options, function(err, ctx, typedStreamingService, end){
      t.error(err, 'should not error on setup');

      // These are the testcases.
      var numbers = [
        undefined, // Note: undefined autoconverts to 0
        3,
        -500000
      ];
      var NumStruct = vdl.registry.lookupOrCreateConstructor(numStructType);
      var expectedNumStructs = [
        new NumStruct({
          string: '0'
        }),
        new NumStruct({
          number: 3,
          bigInt: vdl.BigInt.fromNativeNumber(3),
          string: '3'
        }),
        new NumStruct({
          number: -500000,
          bigInt: vdl.BigInt.fromNativeNumber(-500000),
          string: '-500000'
        })
      ];

      // Prepare and run the stream test.
      var testdata = {
        inArg: undefined,
        inData: numbers,
        serviceMethod: typedStreamingService.structValueStream,
        writeType: vdl.types.FLOAT64,
        readType: numStructType,
        onResolveFunc: function(numReceived) {
          t.deepEqual(numReceived, numbers.length,
            'service sent correct # of values');
          end(t);
        },
        onDataFunc: function(actual, dataIndex) {
          t.ok(actual instanceof NumStruct, 'value is a NumStruct');
          t.deepEqual(actual, expectedNumStructs[dataIndex],
            'number converted to NumStruct');
        }
      };
      streamTest(t, ctx, testdata, end);
    });
  });

  // typedStreamingService.anyStream tests:
  // - the any stream succeeds in both directions
  // - complicated types can be sent across the stream in both directions
  // - the types received by the server match the expected types
  // - the types received by the client match the expected types
  test(namePrefix + 'typedStreamingService.anyStream()', function(t) {
    setup(options, function(err, ctx, typedStreamingService, end){
      t.error(err, 'should not error on setup');

      // These are the testcases.
      var typesSent = [
        vdl.types.JSVALUE,
        vdl.types.INT32,
        vdl.types.INT64,
        vdl.types.COMPLEX128,
        vdl.types.STRING,
        vdl.types.BOOL,
        numStructType,
        boolListType,
        typeListType
      ];

      var NumStruct = vdl.registry.lookupOrCreateConstructor(numStructType);
      var BoolList = vdl.registry.lookupOrCreateConstructor(boolListType);
      var TypeList = vdl.registry.lookupOrCreateConstructor(typeListType);

      var sendList = [
        3.14,
        new builtins.INT32(5),
        new builtins.INT64(-15),
        new builtins.COMPLEX128(new vdl.Complex(5, -5)),
        new builtins.STRING('abc'),
        new builtins.BOOL(true),
        new NumStruct({
          number: -0.5
        }),
        new BoolList([true, true, false, false]),
        new TypeList(typesSent)
      ];

      // Prepare and run the stream test.
      var testdata = {
        inArg: typesSent,
        inData: sendList,
        serviceMethod: typedStreamingService.anyStream,
        writeType: vdl.types.ANY,
        readType: vdl.types.ANY,
        onResolveFunc: function(typesReceived) {
          t.deepEqual(typesReceived, typesSent,
          'service sent back the correct types');
          end(t);
        },
        onDataFunc: function(actual, dataIndex) {
          if (actual._type === undefined) {
            t.ok(typesSent[dataIndex].equals(vdl.types.JSVALUE),
              'value is native');
          } else {
            t.deepEqual(actual._type, typesSent[dataIndex], 'type matches');
          }
          t.deepEqual(actual, sendList[dataIndex], 'received correct value');
        }
      };
      streamTest(t, ctx, testdata, end);
    });
  });

  function setup(options, cb) {
    var dispatcher = leafDispatcher(options.definition);

    serve('testing/typeService', dispatcher, function(err, res) {
      cb(err, res.runtime.getContext(), res.service, res.end);
    });
  }
}

/*
 * Performs a stream test that assumes <= 1 input arg to the service method.
 * testdata contains inArg, inData, serviceMethod, writeType, readType,
 * onResolveFunc, onDataFunc
 * Note: onResolveFunc and onDataFunc should end the test.
 * Optional testdata fields: inDataThrowRegexp, onErrorFunc, and onRejectFunc;
 * these are most useful for error test cases.
 */
function streamTest(t, ctx, testdata, end) {
  // The Error function is optional; successful test cases never need it.
  function error(err) {
    t.error(err, 'should not error');
    end(t);
  }

  // Determine the correct onRejectFunc and onErrorFunc handlers.
  var onRejectFunc = testdata.onRejectFunc || error;
  var onErrorFunc = testdata.onErrorFunc || error;

  // 1. Create a stream reader/writer to receive the values
  var promise = testdata.serviceMethod(ctx, testdata.inArg);
  var stream = promise.stream;
  t.deepEqual(stream.writeType, testdata.writeType, 'inStream matches type');
  t.deepEqual(stream.readType, testdata.readType, 'outStream matches type');

  // 2. Handle RPC
  promise.then(testdata.onResolveFunc).catch(onRejectFunc);

  // 3. Setup listeners for the stream. Data should be NumStructs
  stream.on('error', onErrorFunc);

  var dataIndex = 0;
  stream.on('data', function(actual) {
    testdata.onDataFunc(actual, dataIndex);
    dataIndex++;
  });

  // 4. Send data through the stream.
  for (var i = 0; i < testdata.inData.length; i++) {
    if (testdata.inDataThrowRegexp) {
      t.throws(stream.write.bind(stream, testdata.inData[i]),
        testdata.inDataThrowRegexp, 'stream write throws on bad input');
    } else {
      stream.write(testdata.inData[i]);
    }
  }

  // 5. End the stream.
  stream.end();
}
