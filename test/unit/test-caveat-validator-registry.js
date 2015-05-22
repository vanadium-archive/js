// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var CaveatValidatorRegistry =
  require('../../src/security/caveat-validator-registry');
var context = require('../../src/context');
var caveats = require('../../src/security/caveats');

var testCaveats = require('../vdl-out/javascript-test/security/caveat');

function getMockSecurityCall() {
  return {
    method: '',
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
  };
}


test('Validating caveats', function(t) {
  var registry = new CaveatValidatorRegistry();
  var call = getMockSecurityCall();
  var ctx = context.Context();

  // Keep track of the validation calls when they happen.
  var seenCalls = [];

  // Register caveat validators.
  registry.register(testCaveats.CaveatThatValidates,
    function(ctx, fnCall, param) {
    t.equal(fnCall, call, 'Contexts should match');
    t.equal(param._type, (new testCaveats.CaveatThatValidatesData())._type,
      'Validation param has the correct type (CaveatThatValidates)');
    t.deepEqual(param, testCaveats.CaveatThatValidatesExpectedData,
      'Validation param matches expectation (CaveatThatValidates)');

    seenCalls.push('validate');

    return Promise.resolve();
  });
  registry.register(testCaveats.CaveatDoesntValidate,
    function(ctx, fnCall, param) {
    t.equal(fnCall, call, 'Contexts should match');
    t.deepEqual(param, testCaveats.CaveatDoesntValidateExpectedData.val,
      'Validation param matches expectation (CaveatDoesntValidate)');

    seenCalls.push('not validate');

    throw new Error('Validation should fail when this is thrown');
  });

  // Make calls to validate(), providing caveats.
  registry.validate(
    ctx, call,
    caveats.createCaveat(testCaveats.CaveatThatValidates,
      testCaveats.CaveatThatValidatesExpectedData),
    function(err) {
      t.notOk(err, 'Should validate');
      registry.validate(
        ctx, call,
        caveats.createCaveat(testCaveats.CaveatDoesntValidate,
          testCaveats.CaveatDoesntValidateExpectedData),
        function(err) {
          t.ok(err, 'Shouldn\'t validate');

          // Test re-registering on the same UUID. This should replace the
          // validation function.
          registry.register(testCaveats.CaveatWithCollision,
            function(ctx, fnCall, param, cb) {
            t.equal(fnCall, call, 'Contexts should match');
            t.deepEqual(param, testCaveats.CaveatWithCollisionExpectedData.val,
              'Validation param matches expectation (CaveatWithCollision)');

            seenCalls.push('collision');

            cb(new Error('Validation should fail when this is thrown'));
            });
          registry.validate(
            ctx, call,
            caveats.createCaveat(testCaveats.CaveatWithCollision,
                       testCaveats.CaveatWithCollisionExpectedData.val),
            function(err) {
              t.ok(err,
                'Still shouldn\'t validate after validation function changes');
                t.deepEqual(seenCalls,
                  ['validate', 'not validate', 'collision'],
                  'All validation functions are called in the right order.');
              t.end();
            });
        });
    });
});

test('Unknown caveat id', function(t) {
  var registry = new CaveatValidatorRegistry();
  var call = getMockSecurityCall();
  var ctx = context.Context();
  registry.validate(ctx, call,
  {
    id: 99,
    paramVom: null
  }, function(err) {
    t.ok(err, 'Got an error');
    t.ok((''+err).indexOf('Unknown caveat id'),
      'Expected unknown caveat error');
    t.end();
  });
});

test('Returning error in validation function fails due to more than expected ' +
  'out args', function(t) {
  var registry = new CaveatValidatorRegistry();
  var call = getMockSecurityCall();
  var ctx = context.Context();

  registry.register(testCaveats.CaveatDoesntValidate,
    function(fnCall, param) {
    return new Error('This error shouldn\'t be returned');
  });
  registry.validate(ctx, call,
    caveats.createCaveat(testCaveats.CaveatDoesntValidate,
      testCaveats.CaveatDoesntValidateExpectedData), function(err) {
    t.ok(err, 'Got an error');
    t.ok((''+err).indexOf(
      'Non-undefined value returned from function with 0 out args') !== -1,
      'Error due to non-undefined value returned from 0-arg function');
    t.end();
  });
});
