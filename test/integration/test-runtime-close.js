var test = require('prova');
var veyron = require('../../');
var context = require('../../src/runtime/context');
var config = require('./default-config');

test('runtime.close(cb)', function(assert) {
  var ctx = context.Context();
  veyron.init(config, oninit);

  function oninit(err, runtime) {
    assert.error(err);
    runtime.bindTo(ctx, 'test_service/cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    this.close(assert.end);
  }
});

test('var promise = runtime.close()', function(assert) {
  veyron
  .init(config)
  .then(bindTo)
  .then(close)
  .then(end)
  .catch(assert.end);

  var rt;
  var ctx = context.Context();

  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'test_service/cache');
  }

  function close(service) {
    return rt.close();
  }

  function end() {
    assert.end();
  }
});
