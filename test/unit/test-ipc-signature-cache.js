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
var byteUtil = require('../../src/vdl/byte-util');
var vom = require('../../src/vom');
var app = require('../../src/gen-vdl/v.io/x/ref/services/wsprd/app');
var vtrace = require('../../src/vtrace');
var vdlsig = require('../../src/gen-vdl/v.io/v23/vdlroot/signature');

var freshSig = [ new vdlsig.Interface({ doc: 'fresh signature' }) ];
var cachedSig = [ new vdlsig.Interface({ doc: 'cached signature'}) ];
var staleSig = [ new vdlsig.Interface({ doc: 'bad signature' }) ];
var name = 'service_name';

var CACHE_TTL = 100; // we set the signature cache TTL to 100ms for tests.
function createProxy() {
  return createMockProxy(function(message, type) {
    if (type === Outgoing.REQUEST) {
      var decodedData = vom.decode(byteUtil.hex2Bytes(message));
      if (decodedData.method !== 'Signature') {
        throw new Error('Unexpected method call');
      }
      var response = new app.RpcResponse();
      response.outArgs = [freshSig];
      return byteUtil.bytes2Hex(vom.encode(response));
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
      assert.notDeepEqual(signature, freshSig);
      assert.deepEqual(signature, cachedSig);
      assert.notDeepEqual(signature, staleSig);
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
        assert.notDeepEqual(signature, cachedSig);
        assert.notDeepEqual(signature, staleSig);
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
      assert.notDeepEqual(signature, cachedSig);
      assert.notDeepEqual(signature, staleSig);
      assert.deepEqual(cacheEntry, signature);

      assert.end();
    })
    .catch(assert.end);
  });
