// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var Client = require('../../src/rpc/client.js');
var context = require('../../src/context');
var createSignature = require('../../src/vdl/create-signature');
var createMockProxy = require('./mock-proxy');
var vdl = require('../../src/vdl');
var byteUtil = require('../../src/vdl/byte-util');
var vom = require('../../src/vom');
var hexVom = require('../../src/lib/hex-vom');
var vtrace = require('../../src/vtrace');
var app = require('../../src/gen-vdl/v.io/x/ref/services/wspr/internal/app');
var SharedContextKeys = require('../../src/runtime/shared-context-keys');

var mockService = {
  tripleArgMethod: function(ctx, serverCall, a, b, c) {},
  singleArgMethod: function(ctx, serverCall, a) {},
  lyingBoolMethod: function(ctx, serverCall) {},
};
var mockServiceDescs = [
  {
    methods: [
      {
        name: 'LyingBoolMethod',
        inArgs: [],
        outArgs: [
          {
            name: 'Is VanadiumRPCRequest not Bool',
            type: vdl.types.BOOL
          }
        ]
      }
    ]
  }
];

var mockSignature = createSignature(mockService, mockServiceDescs);
var mockRuntime = {
  _controller: null,
};

function testContext() {
  var ctx = new context.Context();
  ctx = vtrace.withNewStore(ctx);
  ctx = vtrace.withNewTrace(ctx);
  ctx = ctx.withValue(SharedContextKeys.RUNTIME, mockRuntime);
  return ctx;
}

var mockProxy = createMockProxy(function(data, type) {
  return vom.decode(byteUtil.hex2Bytes(data)).then(function(decodedData) {
    var response = new app.RpcResponse();

    if (decodedData instanceof app.RpcRequest &&
        decodedData.method === 'Signature') {
      response.outArgs = [mockSignature];
    } else {
      // Take the first arg and return it in a result list.
      response.outArgs = [decodedData];
    }
    return hexVom.encode(response);
  });
});

test('creating instances', function(assert) {
  assert.equal(typeof Client, 'function');
  assert.ok(Client() instanceof Client); // jshint ignore:line
  assert.end();
});

test('Test that bindTo fails on missing context - using callbacks',
  function(assert) {
  var client = new Client(mockProxy);

  client.bindTo('service-name', function(err) {
    assert.ok(err, 'expected to error on no context');
    assert.end();
  });
});

test('Test that bindTo fails on missing context - using promises',
  function(assert) {
  var client = new Client(mockProxy);

  client
  .bindTo('service-name')
  .then(function() {
    assert.fail('should not succeed');
    assert.end();
  }, function(err) {
    assert.ok(err, 'expected to error on no context');
    assert.end();
  })
  .catch(assert.end);
});


function validateBoundService(assert, boundService) {
    var expectedMethods = Object.keys(mockService).sort();
    assert.deepEqual(
      Object.keys(boundService).sort(),
      expectedMethods,
      'bound service methods don\'t match expectation');
    for (var key in boundService) { // jshint ignore:line
      assert.notOk(key in expectedMethods,
        'key ' + key + ' not expect on service');
      assert.ok(typeof boundService[key] === 'function',
        'non-function key on bound service ' + key);
    }

    assert.ok(boundService.__signature);
}

test('Test that correct bindTo call succeeds - using callbacks',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.bindTo(ctx, 'service-name', function(err, boundService) {
    assert.notOk(err, 'no error expected');
    validateBoundService(assert, boundService);
    assert.end();
  });
});

test('Test that correct bindTo call succeeds - using promises',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.bindTo(ctx, 'service-name')
    .then(function(boundService) {
      validateBoundService(assert, boundService);
      assert.end();
    })
    .catch(function(err) {
    assert.notOk(err, 'no error expected');
    assert.end();
  });
});

test('Test that service.method() returns the correct result - using callbacks',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.bindTo(ctx, 'service-name', onservice);

  function onservice(err, service) {
    assert.error(err);

    service.tripleArgMethod(ctx, 3, 'X', null, onmethod);
  }

  function onmethod(err, result) {
    assert.error(err);
    assert.equal(result.method, 'TripleArgMethod');
    assert.equal(result.numInArgs, 3);
    assert.end();
  }
});

test('Test that service.method() returns the correct result - using promises',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client
    .bindTo(ctx, 'service-name')
    .then(function(service) {
      return service.singleArgMethod(ctx, 1);
    })
    .then(function(result) {
      assert.equal(result.method, 'SingleArgMethod');
      assert.equal(result.numInArgs, 1);
      assert.end();
    })
    .catch(assert.end);
});

test('Test that service.method() fails without a context - using callbacks',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.bindTo(ctx, 'service-name', function(err, service) {
    assert.error(err);

    service.tripleArgMethod(3, 'X', null, function(err, result) {
      assert.ok(err, 'should error');
      assert.notOk(result);
      assert.end();
    });
  });
});

test('Test that service.method() fails without a context - using promises',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.bindTo(ctx, 'service-name', function(err, service) {
    assert.error(err);

    service
      .singleArgMethod(1)
      .then(function(result) {
        assert.fail('should not succeed');
        assert.end();
      }, function(err) {
        assert.ok(err, 'should error');
        assert.end();
      })
      .catch(assert.end);
  });
});

function assertStrBoolNotCompatible(assert, err, result) {
  assert.ok(err, 'errors when receiving string instead of bool');
  assert.ok(err.message.indexOf('are not compatible') !== -1,
    'err is not compatible');
  assert.notOk(result, 'no result');
}

test('Test that service.method() fails when receiving bad outArgs - ' +
  'using callbacks', function(assert) {

  var client = new Client(mockProxy);
  var ctx = testContext();

  client.bindTo(ctx, 'service-name', function(err, service) {
    assert.error(err);

    service.lyingBoolMethod(ctx, function(err, result) {
      // LyingBoolMethod gives a string back, but it says it will be a bool.
      assertStrBoolNotCompatible(assert, err, result);
      assert.end();
    });
  });
});

test('Test that service.method() fails when receiving bad outArgs - ' +
  'using promises', function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client
    .bindTo(ctx, 'service-name')
    .catch(assert.end) // cannot fail here
    .then(function(service) {
      return service.lyingBoolMethod(ctx);
    })
    .then(function(result) {
      assert.end('Did not error when receiving string instead of bool');
    })
    .catch(function(err) {
      // LyingBoolMethod gives a string back, but it says it will be a bool.
      assertStrBoolNotCompatible(assert, err, null);
      assert.end();
    });
});

test('service.method() - callback error', function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.bindTo(ctx, 'service-name', onservice);

  function onservice(err, service) {
    assert.error(err, 'should not error');

    service.tripleArgMethod(ctx, 3, 'X', onmethod);
  }

  function onmethod(err, result) {
    assert.ok(err, 'should error');
    assert.equal(err.message,
      'app:op: Client RPC call TripleArgMethod(3,X) had an incorrect ' +
      'number of arguments. Expected format: TripleArgMethod(a,b,c)');
    assert.notOk(result, 'should not have results');
    assert.end();
  }
});

test('service.method() - promise error', function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client
    .bindTo(ctx, 'service-name')
    .then(triggerError)
    .then(function(result) {
      assert.fail('should not succeed');
    }, function(err) {
      assert.ok(err, 'should error');
      assert.equal(err.message,
        'app:op: Client RPC call TripleArgMethod(3,X) had an incorrect ' +
        'number of arguments. Expected format: TripleArgMethod(a,b,c)'
      );
      assert.end();
    })
    .catch(assert.end);

  function triggerError(service) {
    // Calling with two args (after ctx)
    return service.tripleArgMethod(ctx, 3, 'X');
  }
});

test('var promise = client.signature(ctx, name) - promise', function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.signature(ctx, 'service-name')
  .then(function(sigs) {
    assert.deepEqual(sigs, mockSignature);
    assert.end();
  }).catch(function(err) {
    assert.error(err);
    assert.end();
  });
});

test('client.signature(ctx, name, callback) - callback', function(assert) {
  var client = new Client(mockProxy);
  var ctx = testContext();

  client.signature(ctx, 'service-name', function(err, sigs) {
    assert.error(err);
    assert.deepEqual(sigs, mockSignature);
    assert.end();
  });

});

test('client.signature(name, callback) - no context', function(assert) {
  var client = new Client(mockProxy);

  client.signature('service-name', function(err, sigs) {
    assert.ok(err, 'should error');
    assert.notOk(sigs);
    assert.end();
  });
});

test('var promise = client.signature(name) - no context', function(assert) {
  var client = new Client(mockProxy);

  client.signature('service-name')
  .then(function(sigs) {
      assert.fail('should not succeed');
      assert.end();
  }).catch(function(err) {
    assert.ok(err, 'should error');
    assert.end();
  });
});
