/*
 * @fileoverview
 * Tests that bindTo properly uses an LRU cache to
 * cache signatures per object name in JavaScript.
 * Scope of the cache is per proxy connection.
 */
var test = require('prova');
var context = require('../../src/runtime/context');
var createMockProxy = require('./mock-proxy');
var Outgoing = require('../../src/proxy/message-type').Outgoing;
var Client = require('../../src/ipc/client.js');
var DecodeUtil = require('../../src/lib/decode-util');
var EncodeUtil = require('../../src/lib/encode-util');
var app = require('../../src/v.io/wspr/veyron/services/wsprd/app');
var vtrace = require('../../src/lib/vtrace');

var freshSig = [ { foo: 'fresh signature' } ];
var cachedSig = [ { foo: 'cached signature'} ];
var staleSig = [ { foo: 'bad signature' } ];
var name = 'service_name';

var CACHE_TTL = 100; // we set the signature cache TTL to 100ms for tests.
function createProxy() {
  return createMockProxy(function(message, type) {
    if (type === Outgoing.REQUEST) {
      var decodedData = DecodeUtil.decode(message);
      if (decodedData.method !== 'Signature') {
        throw new Error('Unexpected method call');
      }
      var response = new app.VeyronRPCResponse();
      response.outArgs = [freshSig];
      return EncodeUtil.encode(response);
    }
    throw new Error('Unexpected message type');
  }, CACHE_TTL);
}

function testContext() {
  var ctx = new context.Context();
  ctx = vtrace.withNewStore(ctx);
  ctx = vtrace.withNewTrace(ctx);
  return ctx;
}

test('Test getting signature using valid cache - ' +
  'proxy.getServiceSignature(name)',
  function(assert) {
    var proxy = createProxy();
    var client = new Client(proxy);

    // fake a valid cached signature
    proxy.signatureCache.set(name, cachedSig);

    client.signature(testContext(), name)
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
      client.signature(testContext(), name)
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

    client.signature(testContext(), name)
    .then(function(signature) {
      var cacheEntry = proxy.signatureCache.get(name);

      assert.deepEqual(signature, freshSig);
      assert.deepEqual(cacheEntry, signature);

      assert.end();
    })
    .catch(assert.end);
  });
