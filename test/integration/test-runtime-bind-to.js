var test = require('prova');
var veyron = require('../../');
var config = require('./default-config');

test('Test binding to a Go service named test_service/cache - ' +
  'runtime.bindTo(name, callback)', function(assert) {
  var rt;

  veyron.init(config, oninit);

  function oninit(err, runtime) {
    assert.error(err);

    rt = runtime;
    var ctx = rt.getContext();
    runtime.bindTo(ctx, 'test_service/cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    assert.ok(service);

    rt.close(assert.end);
  }
});

test('Test binding to a Go service named test_service/cache - ' +
  'var promise = runtime.bindTo(name)', function(assert) {
  veyron
  .init(config)
  .then(bindTo)
  .catch(assert.end);

  function bindTo(runtime) {
    var ctx = runtime.getContext();
    return runtime
    .bindTo(ctx, 'test_service/cache')
    .then(function(service) {
      assert.ok(service);
      runtime.close(assert.end);
    });
  }
});

test('Test binding to a non-existing name - ' +
  'runtime.bindTo(badName, callback)', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    var ctx = runtime.getContext();
    runtime.bindTo(ctx, 'does-not/exist', function(err, service) {
      assert.ok(err instanceof Error);

      assert.ok(err instanceof veyron.errors.NoServersError);
      runtime.close(assert.end);
    });
  });
});

test('Test binding to a non-existing name - ' +
  'var promise = runtime.bindTo(badName) ', function(assert) {
  var rt;

  veyron
  .init(config)
  .then(function(runtime) {
    rt = runtime;
    var ctx = rt.getContext();
    return runtime.bindTo(ctx, 'does-not/exist');
  })
  .then(function(service) {
    assert.fail('should not succeed');
    rt.close(assert.end);
  }, function(err) {
    assert.ok(err instanceof Error);
    assert.ok(err instanceof veyron.errors.NoServersError);
    rt.close(assert.end);
  })
  .catch(function(err) {
    assert.error(err);
    rt.close(assert.end);
  });
});

test('Test binding when proxy Url is invalid - ' +
  'runtime.bindTo(name, callback)', function(assert) {

  veyron.init({ wspr: 'http://bad-address.tld' }, onruntime);

  function onruntime(err, runtime) {
    assert.error(err);
    var ctx = runtime.getContext();
    runtime.bindTo(ctx, 'test_service/cache', onservice);
  }

  function onservice(err, service) {
    assert.ok(err instanceof Error);
    assert.end();
  }
});

test('Test binding when wspr Url is invalid - ' +
  'var promise = runtime.bindTo(name) ', function(assert) {

  veyron
  .init({ wspr: 'http://bad-address.tld' })
  .then(bindTo)
  .catch(assert.end);


  function bindTo(runtime) {
    var ctx = runtime.getContext();
    return runtime
    .bindTo(ctx, 'test_service/cache')
    .then(noop, function(err) {
      assert.ok(err instanceof Error);
      assert.end();
    })
    .catch(assert.end);
  }
});

function noop() {}
