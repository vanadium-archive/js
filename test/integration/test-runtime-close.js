var test = require('prova');
var veyron = require('../../');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};

test('runtime.close(cb)', function(assert) {
  veyron.init(config, oninit);

  function oninit(err, runtime) {
    assert.error(err);
    runtime.bindTo('cache', onbind);
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

  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('cache');
  }

  function close(service) {
    return rt.close();
  }

  function end() {
    assert.end();
  }
});
