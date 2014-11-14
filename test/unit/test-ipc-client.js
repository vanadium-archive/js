var test = require('prova');
var Client = require('../../src/ipc/client.js');
var mock = require('./mock');

test('creating instances', function(assert) {
  assert.equal(typeof Client, 'function');
  assert.ok(Client() instanceof Client); // jshint ignore:line
  assert.end();
});

test('client.bindTo(name, [empty service], [callback])', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);

  client.bindTo('service-name', {}, onbind);

  function onbind(err, service) {
    assert.error(err);
    assert.equal(typeof service.signature, 'function');
    assert.equal(Object.keys(service).length, 1);
    assert.end();
  }
});

test('client.bindTo(name, [empty service]) - promise', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);

  client
  .bindTo('service-name', {})
  .then(success)
  .catch(assert.end);

  function success(service) {
    assert.equal(typeof service.signature, 'function');
    assert.equal(Object.keys(service).length, 1);
    assert.end();
  }
});

test('non-empty service', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);
  var signature = mock('client-signature');

  client.bindTo('service-name', signature, function(err, service) {
    assert.error(err);

    Object.keys(signature).forEach(function(method) {
      var message = 'Missing service method "' + method + '"';

      assert.ok(service[method], message);
    });

    assert.ok(service.signature, 'Missing service.signature');
    assert.end();
  });
});

test('service.method() - callback success', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);
  var signature = mock('client-signature');

  client.bindTo('service-name', signature, onservice);

  function onservice(err, service) {
    assert.error(err);

    service.tripleArgMethod(3, 'X', null, onmethod);
  }

  function onmethod(err, result) {
    assert.error(err);
    assert.equal(result.get('methodName'), 'tripleArgMethod');
    assert.deepEqual(result.get('args'), [ 3, 'X', null ]);
    assert.end();
  }
});

test('service.method() - promise success', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);
  var signature = mock('client-signature');

  client
  .bindTo('service-name', signature)
  .then(function(service) {
    return service.singleArgMethod(1);
  })
  .then(function(result) {
    assert.equal(result.get('methodName'), 'singleArgMethod');
    assert.deepEqual(result.get('args'), [ 1 ]);
    assert.end();
  })
  .catch(assert.end);
});

test('service.method() - callback error', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);
  var signature = mock('client-signature');

  client.bindTo('service-name', signature, onservice);

  function onservice(err, service) {
    assert.error(err);

    service.tripleArgMethod(3, 'X', onmethod);
  }

  function onmethod(err, result) {
    assert.ok(err instanceof Error);
    assert.end();
  }
});

test('service.method() - promise error', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);
  var signature = mock('client-signature');

  client
  .bindTo('service-name', signature)
  .then(triggerError)
  .catch(assert.end);

  function triggerError(service) {
    return service
    .singleArgMethod(1, 2)
    .catch(function(err){
      assert.ok(err instanceof Error);
      assert.end();
    });
  }
});

test('service.signature([callback])', function(assert) {
  var proxy = mock('proxy');
  var client = new Client(proxy);
  var signature = mock('client-signature');

  client.bindTo('service-name', signature, onservice);

  function onservice(err, service) {
    assert.error(err);

    service.signature(onsignature);
  }

  function onsignature(err, sig) {
    assert.error(err);
    assert.deepEqual(sig, signature);
    assert.end();
  }
});
