var test = require('prova');
var Client = require('../../src/ipc/client.js');
var context = require('../../src/runtime/context');
var Signature = require('../../src/vdl/signature');
var vom = require('vom');
var DecodeUtil = require('../../src/lib/decode-util');

var mockSignature = [new Signature({
  tripleArgMethod: function(a, b, c) {},
  singleArgMethod: function(a) {}
})];

var mockProxy = {
  cancelFromContext: function() {},
  nextId: function() { return 0; },
  sendRequest: function(data, type, handler, id) {
    var message = DecodeUtil.decode(data);

    if (message.isStreaming) {
      throw new Error('message.isStreaming should be false.');
    }

    handler.handleResponse(0, data);
  },
  dequeue: function() {}
};

test('creating instances', function(assert) {
  assert.equal(typeof Client, 'function');
  assert.ok(Client() instanceof Client); // jshint ignore:line
  assert.end();
});

test('client.bindTo(ctx, name, [empty service], [callback])', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', [new Signature({})], onbind);

  function onbind(err, service) {
    assert.error(err);
    assert.equal(typeof service._signature, 'function');
    assert.equal(Object.keys(service).length, 1);
    assert.end();
  }
});

test('client.bindTo(ctx, name, [empty service]) - promise', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client
  .bindTo(ctx, 'service-name', [new Signature({})])
  .then(success)
  .catch(assert.end);

  function success(service) {
    assert.equal(typeof service._signature, 'function');
    assert.equal(Object.keys(service).length, 1);
    assert.end();
  }
});

test('client.bindTo(name, service, callback) - no context', function(assert) {
  var client = new Client(mockProxy);
  var service = [new Signature({})];

  client.bindTo('service-name', service, function(err) {
    assert.ok(err);
    assert.end();
  });
});

test('client.bindTo(name, service) - promise - no context', function(assert) {
  var client = new Client(mockProxy);
  var service = [new Signature({})];

  client
  .bindTo('service-name', service)
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
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', mockSignature, function(err, service) {
    assert.error(err);

    mockSignature.forEach(function(sig) {
      sig.methods.forEach(function(method) {
        var methodName = vom.MiscUtil.uncapitalize(method.name);
        var message = 'Missing service method "' + methodName + '"';
        assert.ok(service[methodName], message);
      });
    });

    assert.ok(service._signature, 'Missing service._signature');
    assert.end();
  });
});

test('service.method() - callback success', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', mockSignature, onservice);

  function onservice(err, service) {
    assert.error(err);

    service.tripleArgMethod(ctx, 3, 'X', null, onmethod);
  }

  function onmethod(err, result) {
    assert.error(err);
    assert.equal(result.method, 'TripleArgMethod');
    assert.deepEqual(result.inArgs, [ 3, 'X', null ]);
    assert.end();
  }
});

test('service.method() - promise success', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client
  .bindTo(ctx, 'service-name', mockSignature)
  .then(function(service) {
    return service.singleArgMethod(ctx, 1);
  })
  .then(function(result) {
    assert.equal(result.method, 'SingleArgMethod');
    assert.deepEqual(result.inArgs, [ 1 ]);
    assert.end();
  })
  .catch(assert.end);
});

test('service.method() - no context - callback', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', mockSignature, function(err, service) {
    assert.error(err);

    service.tripleArgMethod(3, 'X', null, function(err, result) {
      assert.ok(err);
      assert.notOk(result);
      assert.end();
    });
  });
});

test('service.method() - no context - promise', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', mockSignature, function(err, service) {
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

  client.bindTo(ctx, 'service-name', mockSignature, onservice);

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
  .bindTo(ctx, 'service-name', mockSignature)
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

test('service._signature([callback])', function(assert) {
  var client = new Client(mockProxy);
  var ctx = new context.Context();

  client.bindTo(ctx, 'service-name', mockSignature, onservice);

  function onservice(err, service) {
    assert.error(err);

    service._signature(onsignature);
  }

  function onsignature(err, sig) {
    assert.error(err);
    assert.deepEqual(sig, mockSignature);
    assert.end();
  }
});
