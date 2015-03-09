var isBrowser = require('is-browser');
var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');

test('Test binding to a Go service named test_service/cache - ' +
  'client.bindTo(name, callback)', function(assert) {
  var rt;

  vanadium.init(config, oninit);

  function oninit(err, runtime) {
    assert.error(err);

    rt = runtime;
    var client = rt.newClient();
    var ctx = rt.getContext();
    client.bindTo(ctx, 'test_service/cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    assert.ok(service);

    rt.close(assert.end);
  }
});

test('Test binding to a Go service named test_service/cache - ' +
  'var promise = client.bindTo(name)', function(assert) {
  vanadium
  .init(config)
  .then(bindTo)
  .catch(assert.end);

  function bindTo(runtime) {
    var ctx = runtime.getContext();
    return runtime.newClient()
    .bindTo(ctx, 'test_service/cache')
    .then(function(service) {
      assert.ok(service);
      runtime.close(assert.end);
    });
  }
});

test('Test binding to a non-existing name - ' +
  'client.bindTo(badName, callback)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var client = runtime.newClient();
    var ctx = runtime.getContext();
    client.bindTo(ctx, 'does-not/exist', function(err, service) {
      assert.ok(err instanceof Error);

      assert.ok(err instanceof vanadium.errors.NoServersError);
      runtime.close(assert.end);
    });
  });
});

test('Test binding to a non-existing name - ' +
  'var promise = client.bindTo(badName) ', function(assert) {
  var rt;

  vanadium
  .init(config)
  .then(function(runtime) {
    rt = runtime;
    var client = rt.newClient();
    var ctx = rt.getContext();
    return client.bindTo(ctx, 'does-not/exist');
  })
  .then(function(service) {
    assert.fail('should not succeed');
    rt.close(assert.end);
  }, function(err) {
    assert.ok(err instanceof Error);
    assert.ok(err instanceof vanadium.errors.NoServersError);
    rt.close(assert.end);
  })
  .catch(function(err) {
    assert.error(err);
    rt.close(assert.end);
  });
});

test('Test binding when proxy Url is invalid - ' +
  'client.bindTo(name, callback)', function(assert) {
  if (isBrowser) {
    return assert.end();
  }

  vanadium.init({ wspr: 'http://bad-address.tld' }, onruntime);

  function onruntime(err, runtime) {
    assert.error(err);
    var client = runtime.newClient();
    var ctx = runtime.getContext();
    client.bindTo(ctx, 'test_service/cache', onservice);
  }

  function onservice(err, service) {
    assert.ok(err instanceof Error);
    assert.end();
  }
});

test('Test binding when wspr Url is invalid - ' +
  'var promise = client.bindTo(name) ', function(assert) {
  if (isBrowser) {
    return assert.end();
  }

  vanadium
  .init({ wspr: 'http://bad-address.tld' })
  .then(bindTo)
  .catch(assert.end);


  function bindTo(runtime) {
    var ctx = runtime.getContext();
    return runtime.newClient()
    .bindTo(ctx, 'test_service/cache')
    .then(noop, function(err) {
      assert.ok(err instanceof Error);
      assert.end();
    })
    .catch(assert.end);
  }
});

function noop() {}
