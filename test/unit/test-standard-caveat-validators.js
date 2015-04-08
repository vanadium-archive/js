// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var CaveatValidatorRegistry =
  require('../../src/security/caveat-validator-registry');
var caveats = require('../../src/security/caveats');
var vdlSecurity = require('../../src/gen-vdl/v.io/v23/security');
var context = require('../../src/runtime/context');
var SecurityCall = require('../../src/security/call');
var Time = require('../../src/gen-vdl/v.io/v23/vdlroot/time').Time;
var vdl = require('../../src/vdl');
var contextWithSecurityCall =
  require('../../src/security/context').contextWithSecurityCall;

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

function assertValidation(t, cavType, val, cb) {
  var registry = new CaveatValidatorRegistry();
  var secCall = getMockSecurityCall();
  var cav = caveats.createCaveat(cavType, val);
  var ctx = contextWithSecurityCall(context.Context(), secCall);

  registry.validate(ctx, cav, cb);
}

test('Const caveat is validated correctly', function(t) {
  assertValidation(t, vdlSecurity.ConstCaveat, true, function(err) {
    t.notOk(err, 'const caveat should validate with true param');
    assertValidation(t, vdlSecurity.ConstCaveat, false, function(err) {
      t.ok(err, 'const caveat should not validate with false param');
      t.end();
    });
  });
});

test('Expiry caveat is validated correctly using native Date',
  function(t) {
  var now = Date.now();
  var oneHour = 1*60*60*1000;
  var thePast = new Date(now - oneHour);
  var theFuture = new Date(now + oneHour);

  assertValidation(t, vdlSecurity.ExpiryCaveatX, theFuture, function(err) {
    t.notOk(err, 'expiry caveat should validate when expiry is in the future');
    assertValidation(t, vdlSecurity.ExpiryCaveatX, thePast, function(err) {
      t.ok(err,  'expiry caveat should not validate after expiration');
      t.end();
    });
  });
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
  var thePast = new Date(now - oneHour);
  var thePastTime = toDateWireType(thePast);
  assertValidation(t, vdlSecurity.ExpiryCaveatX, theFutureTime, function(err) {
    t.notOk(err, 'expiry caveat should validate when expiry is in the future');
    assertValidation(t, vdlSecurity.ExpiryCaveatX, thePastTime, function(err) {
      t.ok(err,  'expiry caveat should not validate after expiration');
      t.end();
    });
  });
});

test('Method caveat is validated correctly', function(t) {
  assertValidation(t, vdlSecurity.MethodCaveatX, [], function(err) {
    t.notOk(err, 'empty method list always validates');
    assertValidation(t, vdlSecurity.MethodCaveatX,  ['aMethod'],
      function(err) {
      t.notOk(err, 'method list with just matching method validates');
      assertValidation(t, vdlSecurity.MethodCaveatX, ['Z', 'aMethod', 'X'],
        function(err) {
        t.notOk(err, 'method list including matching method validates');
        assertValidation(t, vdlSecurity.MethodCaveatX,
          ['OtherMethod1', 'OtherMethod2'], function(err) {
          t.ok(err,
            'method list with without matching method fails to validate');
          t.end();
        });
      });
    });
  });
});
