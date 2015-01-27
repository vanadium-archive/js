var test = require('prova');
var veyron = require('../../');
var config = require('./default-config');

test('Test closing runtime - runtime.close(cb)', function(assert) {
  veyron.init(config, oninit);

  function oninit(err, runtime) {
    var ctx = runtime.getContext();
    assert.error(err);
    runtime.bindTo(ctx, 'test_service/cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    this.close(assert.end);
  }
});

test('Test closing runtime - var promise = runtime.close()', function(assert) {
  veyron
  .init(config)
  .then(bindTo)
  .then(close)
  .then(end)
  .catch(assert.end);

  var rt;

  function bindTo(runtime) {
    rt = runtime;
    var ctx = runtime.getContext();
    return runtime.bindTo(ctx, 'test_service/cache');
  }

  function close(service) {
    return rt.close();
  }

  function end() {
    assert.end();
  }
});
