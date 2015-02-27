var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');

test('Test closing runtime - runtime.close(cb)', function(assert) {
  vanadium.init(config, oninit);

  var rt;
  function oninit(err, runtime) {
    rt = runtime;
    var ctx = runtime.getContext();
    assert.error(err);
    var client = runtime.newClient();
    client.bindTo(ctx, 'test_service/cache', onbind);
  }

  function onbind(err, service) {
    assert.error(err);
    rt.close(assert.end);
  }
});

test('Test closing runtime - var promise = runtime.close()', function(assert) {
  vanadium
  .init(config)
  .then(bindTo)
  .then(close)
  .then(end)
  .catch(assert.end);

  var rt;

  function bindTo(runtime) {
    rt = runtime;
    var client = runtime.newClient();
    var ctx = runtime.getContext();
    return client.bindTo(ctx, 'test_service/cache');
  }

  function close(service) {
    return rt.close().then(function() {
      assert.pass('Runtime closed successfully');
    }).catch(function(err) {
      assert.fail(err);
    });
  }

  function end() {
    assert.end();
  }
});
