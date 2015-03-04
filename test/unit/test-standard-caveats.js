var test = require('prova');
var CaveatValidatorRegistry =
  require('../../src/security/caveat-validator-registry');
var caveatUtil = require('./caveat-util');
var vdlSecurity = require('../../src/v.io/v23/security');
var context = require('../../src/runtime/context');
var SecurityContext = require('../../src/security/context');
var VanadiumError = require('../../src/errors/vanadium-error');
var Time = require('../../src/v.io/v23/vdlroot/time').Time;
var vdl = require('../../src/vdl');

function getMockSecurityContext() {
  return new SecurityContext({
    method: 'aMethod', // only field currently used
    suffix: '',
    methodTags: [],
    localBlessings: {
      handle: '',
      publicKey: '',
    },
    remoteBlessings: {
      handle: '',
      publicKey: '',
    },
    localBlessingStrings: [],
    remoteBlessingStrings: [],
    localEndpoint: '',
    remoteEndpoint: ''
  },
  null, // controller
  context.Context());
}

function assertValidate(t, cavType, val, msg) {
  var registry = new CaveatValidatorRegistry();
  var secCtx = getMockSecurityContext();
  var cav = caveatUtil.makeCaveat(cavType, val);

  t.doesNotThrow(function() {
    t.equal(null,
      registry.validate(secCtx, cav),
      msg);
  },
  undefined,
  msg);
}

function assertDoesntValidate(t, cavType, val, msg) {
  var registry = new CaveatValidatorRegistry();
  var secCtx = getMockSecurityContext();
  var cav = caveatUtil.makeCaveat(cavType, val);

  var res;
  try {
    res = registry.validate(secCtx, cav);
  } catch(err) {
    res = err;
  }
  t.ok(res instanceof VanadiumError, msg);
}

test('Const caveat is validated correctly', function(t) {
  assertValidate(t, vdlSecurity.ConstCaveat,
    true, 'const caveat should validate with true param');

  assertDoesntValidate(t, vdlSecurity.ConstCaveat,
    false, 'const caveat should not validate with false param');

  t.end();
});

// TODO(bprosnitz) Enable this after implementing type guessing from native
// types.
test.skip('Expiry caveat is validated correctly using native Date',
  function(t) {
  var now = Date.now();
  var oneHour = 1*60*60*1000;
  var theFuture = new Date(now + oneHour);
  assertValidate(t, vdlSecurity.ExpiryCaveatX,
    theFuture, 'expiry caveat should validate when expiry is in the future');

  var thePast = new Date(now - oneHour);
  assertDoesntValidate(t, vdlSecurity.ExpiryCaveatX,
    thePast, 'expiry caveat should not validate after expiration');

  t.end();
});

function toDateWireType(v) {
  var time = v.getTime();
  var seconds = Math.floor(time / 1000);
  var nanos = Math.floor((time - seconds * 1000) * 1000000);
  var f = new Time({ seconds: vdl.BigInt.fromNativeNumber(seconds),
                         nano: nanos}, true);
  return f;
}

test('Expiry caveat is validated correctly using vdl Time', function(t) {
  var now = Date.now();
  var oneHour = 1*60*60*1000;
  var theFuture = new Date(now + oneHour);
  var theFutureTime = toDateWireType(theFuture);
  assertValidate(t, vdlSecurity.ExpiryCaveatX, theFutureTime,
    'expiry caveat should validate when expiry is in the future');

  var thePast = new Date(now - oneHour);
  var thePastTime = toDateWireType(thePast);
  assertDoesntValidate(t, vdlSecurity.ExpiryCaveatX,
    thePastTime, 'expiry caveat should not validate after expiration');

  t.end();
});

test('Method caveat is validated correctly', function(t) {
  assertValidate(t, vdlSecurity.MethodCaveatX,
    [], 'empty method list always validates');

  assertValidate(t, vdlSecurity.MethodCaveatX,
    ['aMethod'], 'method list with just matching method validates');

  assertValidate(t, vdlSecurity.MethodCaveatX,
    ['Z', 'aMethod', 'X'], 'method list including matching method validates');

  assertDoesntValidate(t, vdlSecurity.MethodCaveatX,
    ['OtherMethod1', 'OtherMethod2'],
    'method list with without matching method fails to validate');

  t.end();
});
