var test = require('prova');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
var cache = require('./cache-service');
var dispatcher = leafDispatcher(cache);
var serve = require('./serve');

test('runtime.bindTo(endpoint, callback) - bind to endpoint of a JS server',
function(assert) {
  serve('testing/cache', dispatcher, function(err, res) {
    assert.error(err);
    var message = res.endpoint + ' should use localhost';

    assert.ok(res.endpoint.match('127.0.0.1'), message);

    res.end(assert);
  });
});
