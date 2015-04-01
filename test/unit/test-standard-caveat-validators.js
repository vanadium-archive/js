// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var CaveatValidatorRegistry =
  require('../../src/security/caveat-validator-registry');
var caveats = require('../../src/security/caveats');
var context = require('../../src/runtime/context');
var SecurityCall = require('../../src/security/call');
var VanadiumError = require('../../src/errors/vanadium-error');
var Time = require('../../src/gen-vdl/v.io/v23/vdlroot/time').Time;
var vdl = require('../../src/vdl');

function getMockSecurityCall() {
  return new SecurityCall({
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

function assertValidate(t, cav, msg) {
  var registry = new CaveatValidatorRegistry();
  var secCall = getMockSecurityCall();

  t.doesNotThrow(function() {
    t.equal(null,
      registry.validate(secCall, cav),
      msg);
  },
  undefined,
  msg);
}

function assertDoesntValidate(t, cav, msg) {
  var registry = new CaveatValidatorRegistry();
  var secCall = getMockSecurityCall();

  var res;
  try {
    res = registry.validate(secCall, cav);
  } catch(err) {
    res = err;
  }
  t.ok(res instanceof VanadiumError, msg);
}

test('Const caveat is validated correctly', function(t) {
  assertValidate(t, caveats.createConstCaveat(true),
    'const caveat should validate with true param');

  assertDoesntValidate(t, caveats.createConstCaveat(false),
    'const caveat should not validate with false param');

  t.end();
});

test('Unconstrained use is validated correctly', function(t) {
  assertValidate(t, caveats.unconstrainedUseCaveat,
    'unconstrained use caveat should validate');

  t.end();
});

test('Expiry caveat is validated correctly using native Date',
  function(t) {
  var now = Date.now();
  var oneHour = 1*60*60*1000;
  var theFuture = new Date(now + oneHour);
  assertValidate(t, caveats.createExpiryCaveat(theFuture),
    'expiry caveat should validate when expiry is in the future');

  var thePast = new Date(now - oneHour);
  assertDoesntValidate(t, caveats.createExpiryCaveat(thePast),
    'expiry caveat should not validate after expiration');

  t.end();
});

function toDateWireType(v) {
  var time = v.getTime();
  var seconds = vdl.BigInt.fromNativeNumber(Math.floor(time / 1000));
  // Convert epochs.
  seconds = seconds.subtract(vdl.BigInt.fromNativeNumber(
    Math.floor(Date.parse('0001-01-01')/1000)));
  var nanos = (time % 1000) * 1000000;
  var f = new Time({ seconds: seconds, nano: nanos}, true);
  return f;
}

test('Expiry caveat is validated correctly using vdl Time', function(t) {
  var now = Date.now();
  var oneHour = 1*60*60*1000;
  var theFuture = new Date(now + oneHour);
  var theFutureTime = toDateWireType(theFuture);
  assertValidate(t, caveats.createExpiryCaveat(theFutureTime),
    'expiry caveat should validate when expiry is in the future');

  var thePast = new Date(now - oneHour);
  var thePastTime = toDateWireType(thePast);
  assertDoesntValidate(t, caveats.createExpiryCaveat(thePastTime),
    'expiry caveat should not validate after expiration');

  t.end();
});

test('Method caveat is validated correctly', function(t) {
  assertValidate(t, caveats.createMethodCaveat([]),
    'empty method list always validates');

  assertValidate(t, caveats.createMethodCaveat(['aMethod']),
    'method list with just matching method validates');

  assertValidate(t, caveats.createMethodCaveat(['Z', 'aMethod', 'X']),
    'method list including matching method validates');

  assertDoesntValidate(t,
    caveats.createMethodCaveat(['OtherMethod1', 'OtherMethod2']),
    'method list with without matching method fails to validate');

  t.end();
});
