var test = require('prova');
var Proxy = require('../../src/proxy');

test('creating instances', function(assert) {
  var proxy = new Proxy();

  assert.equal(typeof Proxy, 'function');
  assert.ok(proxy instanceof Proxy);
  assert.end();
});
