var test = require('prova');
var port = require('../services/config-wsprd').flags.port;
var url = 'ws://localhost:' + port;
var ProxyWappedWebSocket = require('../../src/proxy/websocket');
var now = Date.now;

var knownSignature = {
  get: {
    inArgs: [ 'key' ],
    numOutArgs: 2,
    isStreaming: false
  },
  set: {
    inArgs: [ 'key', 'value' ],
    numOutArgs: 1,
    isStreaming: false
  },
  multiGet: {
    inArgs: [],
    numOutArgs: 1,
    isStreaming: true
  }
};

test('proxy.getServiceSignature(name) - valid cache', function(assert) {
  var proxy = new ProxyWappedWebSocket(url);
  var name = 'test_service/cache';

  // fake a valid cached signature
  proxy.bindCache[name] = {
    fetched: now(),
    signature: {
      foo: 'bar'
    }
  };

  proxy
  .getServiceSignature(name)
  .then(function(signature) {
    assert.equal(signature.foo, 'bar');
    proxy.close(assert.end);
  })
  .catch(assert.end);
});

test('proxy.getServiceSignature(name) - stale cache', function(assert) {
  var proxy = new ProxyWappedWebSocket(url);
  var name = 'test_service/cache';

  // stub with mock cached sig
  proxy.bindCache[name] = {
    // 3 hours ago
    fetched: now() - (3 * 60 * 60 * 1000),
    signature: {
      foo: 'bar'
    }
  };

  proxy
  .getServiceSignature(name)
  .then(function(signature) {
    assert.equal(signature.foo, undefined);

    Object.keys(knownSignature).forEach(function(key) {
      assert.ok(signature.hasOwnProperty(key));

      var actual = signature[key];
      var expected = knownSignature[key];

      assert.deepEqual(actual.inArgs, expected.inArgs);
      assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
      assert.deepEqual(actual.isStreaming, expected.isStreaming);
    });

    proxy.close(assert.end);
  })
  .catch(assert.end);
});

test('proxy.getServiceSignature(name) - set cache', function(assert) {
  var proxy = new ProxyWappedWebSocket(url);
  var name = 'test_service/cache';
  var before = now();

  proxy
  .getServiceSignature(name)
  .then(function(signature) {
    var cache = proxy.bindCache[name];
    var after = now();

    assert.ok(before <= cache.fetched);
    assert.ok(after >= cache.fetched);

    Object.keys(knownSignature).forEach(function(key) {
      assert.ok(signature.hasOwnProperty(key));

      var actual = signature[key];
      var expected = knownSignature[key];

      assert.deepEqual(actual.inArgs, expected.inArgs);
      assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
      assert.deepEqual(actual.isStreaming, expected.isStreaming);
    });

    proxy.close(assert.end);
  })
  .catch(assert.end);
});
