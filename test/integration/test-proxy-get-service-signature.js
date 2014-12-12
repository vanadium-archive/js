var test = require('prova');
var url = 'ws://' + process.env.WSPR_ADDR;
var ProxyWappedWebSocket = require('../../src/proxy/websocket');
var context = require('../../src/runtime/context');
var now = Date.now;

var expectedMethodNames = ['Get', 'Set', 'MultiGet'];

function sigHasMethod(assert, sig, methodName) {
  for (var i = 0; i < sig.length; i++)  {
    var iface = sig[i];
    for (var m = 0; m < iface.methods.length; m++) {
      var method = iface.methods[m];
      if (method.name === methodName) {
        return;
      }
    }
  }
  assert.fail('Method ' + methodName + ' not found in signature ' +
    JSON.stringify(sig));
}

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

    expectedMethodNames.forEach(function(key) {
      sigHasMethod(assert, signature, key);
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

    expectedMethodNames.forEach(function(key) {
      sigHasMethod(assert, signature, key);
    });

    proxy.close(assert.end);
  })
  .catch(assert.end);
});
