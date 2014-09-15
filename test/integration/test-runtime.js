var test = require('prova');
var veyron = require('../../');
var port = require('../services/config-wsprd').flags.port;

test('runtime.bindTo(name)', function(assert) {
  var runtime;
  var config = {
    wspr: 'http://localhost:' + port
  };

  veyron.init(config, oninit);

  function oninit(err, _runtime) {
    assert.error(err);

    runtime = _runtime;
    runtime.bindTo('cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    assert.ok(service);

    // TODO(jasoncampbell): make sure scopes on callbacks are bound correctly
    // this.stop should === runtime.stop.
    runtime.stop(assert.end);
  }
});
