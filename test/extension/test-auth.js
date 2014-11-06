var Postie = require('postie');
var test = require('prova');

var veyron = require('../../src/veyron');

require('./message-passer');

test('"auth" message gets "auth received" response', function(assert) {
  assert.plan(1);

  var extPort = new Postie(window.top);
  extPort.on('auth:received', function() {
    assert.ok(true);
    assert.end();
  });

  extPort.post('auth');
});

test('veyron.init({authenticate: true}) will timeout with error',
    function(assert) {
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
