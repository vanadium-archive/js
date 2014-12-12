var test = require('prova');

var ExtensionEventProxy = require('../../src/proxy/event_proxy');
var veyron = require('../../src/veyron');

test('Test "auth" message gets "auth received" response', function(assert) {
  // Don't test this in node because there is no extension to talk to.
  if (!require('is-browser')) {
    return assert.end();
  }

  var extensionEventProxy = new ExtensionEventProxy();
  assert.plan(1);

  function handleMsg(msg) {
    extensionEventProxy.removeListener('auth:received', handleMsg);
    // Just assert that the callback runs.
    assert.ok(true);
    assert.end();
  }

  extensionEventProxy.on('auth:received', handleMsg);

  extensionEventProxy.send('auth');
});

test('Test veyron.init({authenticate: true}) will timeout with error',
    function(assert) {
      // Don't test this in node because there is no extension to talk to.
      if (!require('is-browser')) {
        return assert.end();
      }
      assert.plan(2);

      var config = {
        authenticate: true,
        authTimeout: 200 //ms
      };
      veyron.init(config, function(err) {
        assert.ok(err);
        assert.ok((/timeout/i).test(err.message));
        assert.end();
      });
});
