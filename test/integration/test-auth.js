var test = require('prova');

var config = require('./default-config');
var veyron = require('../../src/veyron');

test('veyron.init with authentication gives runtime with account name',
    function(t) {

  // Don't test this in node because there is no extension to talk to.
  if (!require('is-browser')) {
    return t.end();
  }

  veyron.init(config, function(err, rt) {
    if (err) {
      t.error(err);
      return t.end(err);
    }

    t.ok(rt, 'runtime exists');
    t.ok(rt.accountName, 'runtime has accountName property');
    t.ok(typeof rt.accountName === 'string', 'rt.accountName is string');
    t.ok(rt.accountName.length > 0, 'rt.accountName has length > 0');
    t.end();
  });
});
