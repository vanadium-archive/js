var test = require('prova');
var Client = require('../../src/ipc/client.js');
var context = require('../../src/runtime/context');
var createSignatures = require('../../src/vdl/create-signatures');
var MessageType = require('../../src/proxy/message-type');
var createMockProxy = require('./mock-proxy');
var DecodeUtil = require('../../src/lib/decode-util');
var EncodeUtil = require('../../src/lib/encode-util');

var mockService = {
  tripleArgMethod: function(ctx, a, b, c) {},
  singleArgMethod: function(ctx, a) {}
};

var mockSignature = createSignatures(mockService);

var mockProxy = createMockProxy(function(data, type) {
  if (type === MessageType.SIGNATURE) {
    return [mockSignature];
  } else {
    // Take the first arg and return it in a result list.
    var decodedData = DecodeUtil.decode(data);
    return EncodeUtil.encode([decodedData]);
  }
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
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', function(err, boundService) {
    assert.notOk(err, 'no error expected');
    validateBoundService(assert, boundService);
    assert.end();
  });
});

test('Test that correct bindTo call succeeds - using promises',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

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
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', onservice);

  function onservice(err, service) {
    assert.error(err);

    service.tripleArgMethod(ctx, 3, 'X', null, onmethod);
  }

  function onmethod(err, result) {
    assert.error(err);
    assert.equal(result.method, 'TripleArgMethod');
    assert.deepEqual(result.inArgs, [3, 'X', null]);
    assert.end();
  }
});

test('Test that service.method() returns the correct result - using promises',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client
    .bindTo(ctx, 'service-name')
    .then(function(service) {
      return service.singleArgMethod(ctx, 1);
    })
    .then(function(result) {
      assert.equal(result.method, 'SingleArgMethod');
      assert.deepEqual(result.inArgs, [1]);
      assert.end();
    })
    .catch(assert.end);
});

test('Test that service.method() fails without a context - using callbacks',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', function(err, service) {
    assert.error(err);

    service.tripleArgMethod(3, 'X', null, function(err, result) {
      assert.ok(err);
      assert.notOk(result);
      assert.end();
    });
  });
});

test('Test that service.method() fails without a context - using promises',
  function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', function(err, service) {
    assert.error(err);

    service
      .singleArgMethod(1)
      .then(function(result) {
        assert.fail('should not succeed');
        assert.end();
      }, function(err) {
        assert.ok(err);
        assert.end();
      })
      .catch(assert.end);
  });
});

test('service.method() - callback error', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', onservice);

  function onservice(err, service) {
    assert.error(err, 'should not error');

    service.tripleArgMethod(ctx, 3, 'X', onmethod);
  }

  function onmethod(err, result) {
    assert.ok(err, 'should error');
    assert.notOk(result, 'should not have results');
    assert.end();
  }
});

test('service.method() - promise error', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client
    .bindTo(ctx, 'service-name')
    .then(triggerError)
    .then(function(result) {
      assert.fail('should not succeed');
    }, function(err) {
      assert.ok(err);
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
  var ctx = new context.Context();

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
  var ctx = new context.Context();

  client.signature(ctx, 'service-name', function(err, sigs) {
    assert.error(err);
    assert.deepEqual(sigs, mockSignature);
    assert.end();
  });

});

test('client.signature(name, callback) - no context', function(assert) {
  var client = new Client(mockProxy);

  client.signature('service-name', function(err, sigs) {
    assert.ok(err);
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
    assert.ok(err);
    assert.end();
  });
});
