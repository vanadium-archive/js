var test = require('prova');
var veyron = require('../../');

var config = {
  wspr: 'http://' + process.env.WSPR_ADDR
};

test('runtime.close(cb)', function(assert) {
  veyron.init(config, oninit);

  function oninit(err, runtime) {
    assert.error(err);
    runtime.bindTo('test_service/cache', onbind);
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
    return runtime.bindTo('test_service/cache');
  }

  function close(service) {
    return rt.close();
  }

  function end() {
    assert.end();
  }
});
