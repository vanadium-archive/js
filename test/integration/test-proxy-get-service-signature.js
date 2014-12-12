var test = require('prova');
var url = 'ws://' + process.env.WSPR_ADDR;
var ProxyWappedWebSocket = require('../../src/proxy/websocket');
var context = require('../../src/runtime/context');
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

test('Test getting signature using valid cache - ' +
  'proxy.getServiceSignature(name)', function(assert) {
  var proxy = new ProxyWappedWebSocket(url);
  var name = 'test_service/cache';
  var ctx = context.Context();

  // fake a valid cached signature
  proxy.bindCache[name] = {
    fetched: now(),
    signature: {
      foo: 'bar'
    }
  };

  proxy
  .getServiceSignature(ctx, name)
  .then(function(signature) {
    assert.equal(signature.foo, 'bar');
    proxy.close(assert.end);
  })
  .catch(assert.end);
});

test('Test getting signature using stale cache - ' +
  'proxy.getServiceSignature(name)', function(assert) {
  var proxy = new ProxyWappedWebSocket(url);
  var name = 'test_service/cache';
  var ctx = context.Context();

  // stub with mock cached sig
  proxy.bindCache[name] = {
    // 3 hours ago
    fetched: now() - (3 * 60 * 60 * 1000),
    signature: {
      foo: 'bar'
    }
  };

  proxy
  .getServiceSignature(ctx, name)
  .then(function(signature) {
    assert.equal(signature.foo, undefined);

    Object.keys(knownSignature).forEach(function(key) {
      var actual = signature.get(key);
      var expected = knownSignature[key];

      assert.deepEqual(actual.inArgs, expected.inArgs);
      assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
      assert.deepEqual(actual.isStreaming, expected.isStreaming);
    });

    proxy.close(assert.end);
  })
  .catch(assert.end);
});

test('Test service signature cache is set properly - ' +
  'proxy.getServiceSignature(name)', function(assert) {
  var proxy = new ProxyWappedWebSocket(url);
  var name = 'test_service/cache';
  var before = now();
  var ctx = context.Context();

  proxy
  .getServiceSignature(ctx, name)
  .then(function(signature) {
    var cache = proxy.bindCache[name];
    var after = now();

    assert.ok(before <= cache.fetched);
    assert.ok(after >= cache.fetched);

    Object.keys(knownSignature).forEach(function(key) {
      var actual = signature.get(key);
      var expected = knownSignature[key];

      assert.deepEqual(actual.inArgs, expected.inArgs);
      assert.deepEqual(actual.numOutArgs, expected.numOutArgs);
      assert.deepEqual(actual.isStreaming, expected.isStreaming);
    });

    proxy.close(assert.end);
  })
  .catch(assert.end);
});
