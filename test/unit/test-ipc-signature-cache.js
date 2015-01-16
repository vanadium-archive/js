/*
 * @fileoverview
 * Tests that bindTo properly uses an LRU cache to
 * cache signatures per object name in JavaScript.
 * Scope of the cache is per proxy connection.
 */
var test = require('prova');
var context = require('../../src/runtime/context');
var createMockProxy = require('./mock-proxy');
var MessageType = require('../../src/proxy/message-type');
var Client = require('../../src/ipc/client.js');

var freshSig = [ { foo: 'fresh signature' } ];
var cachedSig = [ { foo: 'cached signature'} ];
var staleSig = [ { foo: 'bad signature' } ];
var name = 'service_name';
var ctx = context.Context();

var CACHE_TTL = 100; // we set the signature cache TTL to 100ms for tests.
function createProxy() {
  return createMockProxy(function(message, type) {
    if (type === MessageType.SIGNATURE) {
      return [ freshSig ];
    }
    throw new Error('Unexpected message type');
  }, CACHE_TTL);
}

test('Test getting signature using valid cache - ' +
  'proxy.getServiceSignature(name)',
  function(assert) {
    var proxy = createProxy();
    var client = new Client(proxy);

    // fake a valid cached signature
    proxy.signatureCache.set(name, cachedSig);

    client.signature(ctx, name)
    .then(function(signature) {
      assert.deepEqual(signature, cachedSig);
      assert.end();
    })
    .catch(assert.end);
  });

test('Test getting signature does not use stale cache entry - ' +
  'proxy.getServiceSignature(name)',
  function(assert) {
    var proxy = createProxy();
    var client = new Client(proxy);

    // stub with mock cached sig
    proxy.signatureCache.set(name, staleSig);

    // wait > CACHE_TTL ms until it goes stale, ensure we get a fresh signature
    setTimeout( function() {
      client.signature(ctx, name)
      .then(function(signature) {
        assert.deepEqual(signature, freshSig);
        assert.end();
      })
      .catch(assert.end);
    }, CACHE_TTL + 1);

  });

test('Test service signature cache is set properly - ' +
  'proxy.getServiceSignature(name)',
  function(assert) {
    var proxy = createProxy();
    var client = new Client(proxy);

    client.signature(ctx, name)
    .then(function(signature) {
      var cacheEntry = proxy.signatureCache.get(name);

      assert.deepEqual(signature, freshSig);
      assert.deepEqual(cacheEntry, signature);

      assert.end();
    })
    .catch(assert.end);
  });