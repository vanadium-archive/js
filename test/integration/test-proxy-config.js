var test = require('prova');
var veyron = require('../../');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};

test('runtime._getProxyConnection().config', function(assert) {
  veyron.init(config, function(err, runtime) {
    assert.error(err);

    // TODO(bprosnitz) Change this to use an exposed interface for the
    // proxy connection after the config is exposed.

    // Initialize the websocket.
    runtime._getProxyConnection().getWebSocket();

    // Get the config promise
    runtime
    ._getProxyConnection()
    .config
    .then(function(config) {
      assert.ok(config.mounttableRoot, 'config.mounttableRoot should exist');
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});
