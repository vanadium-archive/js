var test = require('prova');
var veyron = require('../../');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};

test('runtime.bindTo(name, callback)', function(assert) {
  var rt;

  veyron.init(config, oninit);

  function oninit(err, runtime) {
    assert.error(err);

    rt = runtime;
    runtime.bindTo('cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    assert.ok(service);

    rt.close(assert.end);
  }
});

test('var promise = runtime.bindTo(name)', function(assert) {
  veyron
  .init(config)
  .then(bindTo)
  .catch(assert.end);

  function bindTo(runtime) {
    return runtime
    .bindTo('cache')
    .then(function(service) {
      assert.ok(service);
      runtime.close(assert.end);
    });
  }
});

test('runtime.bindTo(name, [callback]) - bad wspr url', function(assert) {
  veyron.init({ wspr: 'http://bad-address.tld' }, onruntime);

  function onruntime(err, runtime) {
    assert.error(err);
    runtime.bindTo('cache', onservice);
  }

  function onservice(err, service) {
    assert.ok(err instanceof Error);
    assert.end();
  }
});

test('var promise = runtime.bindTo(name) - bad wspr url', function(assert) {
  veyron
  .init({ wspr: 'http://bad-address.tld' })
  .then(bindTo)
  .catch(assert.end);

  function bindTo(runtime) {
    return runtime
    .bindTo('cache')
    .then(noop, function(err) {
      assert.ok(err instanceof Error);
      assert.end();
    })
    .catch(assert.end);
  }
});

function noop() {}
