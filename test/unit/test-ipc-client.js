var test = require('prova');
var Client = require('../../src/ipc/client.js');
var context = require('../../src/runtime/context');
var createSignatures = require('../../src/vdl/create-signatures');
var MessageType = require('../../src/proxy/message-type');
var vom = require('vom');
var createMockProxy = require('./mock-proxy');

var mockSignature = createSignatures({
  tripleArgMethod: function(a, b, c) {},
  singleArgMethod: function(a) {}
});

function createProxy(signature) {
  return createMockProxy(function(data, type) {
    if (type === MessageType.SIGNATURE) {
      if (signature) {
        return signature;
      } else {
        return mockSignature;
      }
    } else {
      return data;
    }
  });
}

test('creating instances', function(assert) {
  assert.equal(typeof Client, 'function');
  assert.ok(Client() instanceof Client); // jshint ignore:line
  assert.end();
});

test('client.bindTo(ctx, name, [empty service], [callback])', function(assert) {
  var mockProxy = createProxy(createSignatures({}));
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', onbind);

  function onbind(err, service) {
    assert.error(err);
    assert.equal(Object.keys(service).length, 0);
    assert.end();
  }
});

test('client.bindTo(ctx, name, [empty service]) - promise', function(assert) {
  var mockProxy = createProxy(createSignatures({}));
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client
    .bindTo(ctx, 'service-name')
    .then(success)
    .catch(assert.end);

  function success(service) {
    assert.equal(Object.keys(service).length, 0);
    assert.end();
  }
});

test('client.bindTo(name, service, callback) - no context', function(assert) {
  var mockProxy = createProxy(createSignatures({}));
  var client = new Client(mockProxy);

  client.bindTo('service-name', function(err) {
    assert.ok(err);
    assert.end();
  });
});

test('client.bindTo(name, service) - promise - no context', function(assert) {
  var mockProxy = createProxy(createSignatures({}));
  var client = new Client(mockProxy);

  client
    .bindTo('service-name')
    .then(function() {
      assert.fail('should not succeed');
      assert.end();
    }, function(err) {
      assert.ok(err);
      assert.end();
    })
    .catch(assert.end);
});


test('non-empty service', function(assert) {
  var mockProxy = createProxy(mockSignature);
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', function(err, service) {
    assert.error(err);

    mockSignature.forEach(function(sig) {
      sig.methods.forEach(function(method) {
        var methodName = vom.MiscUtil.uncapitalize(method.name);
        var message = 'Missing service method "' + methodName + '"';
        assert.ok(service[methodName], message);
      });
    });

    assert.end();
  });
});

test('service.method() - callback success', function(assert) {
  var mockProxy = createProxy(mockSignature);
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

test('service.method() - promise success', function(assert) {
  var mockProxy = createProxy(mockSignature);
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

test('service.method() - no context - callback', function(assert) {
  var mockProxy = createProxy(mockSignature);
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

test('service.method() - no context - promise', function(assert) {
  var mockProxy = createProxy(mockSignature);
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
  var mockProxy = createProxy(mockSignature);
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
  var mockProxy = createProxy(mockSignature);
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
  var mockProxy = createProxy(mockSignature);
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
  var mockProxy = createProxy(mockSignature);
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.signature(ctx, 'service-name', function(err, sigs) {
    assert.error(err);
    assert.deepEqual(sigs, mockSignature);
    assert.end();
  });

});

test('client.signature(name, callback) - no context', function(assert) {
  var mockProxy = createProxy(mockSignature);
  var client = new Client(mockProxy);

  client.signature('service-name', function(err, sigs) {
    assert.ok(err);
    assert.notOk(sigs);
    assert.end();
  });
});

test('var promise = client.signature(name) - no context', function(assert) {
  var mockProxy = createProxy(mockSignature);
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