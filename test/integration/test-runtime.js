var test = require('prova');
var veyron = require('../../');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};

test('runtime.bindTo(name)', function(assert) {
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
    this.close(assert.end);
  }
});
