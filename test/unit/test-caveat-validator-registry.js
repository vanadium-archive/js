var test = require('prova');
var CaveatValidatorRegistry =
  require('../../src/security/caveat-validator-registry');
var context = require('../../src/runtime/context');

var testCaveats = require('../vdl-out/javascript-test/security/caveat');
var caveatUtil = require('./caveat-util');

test('Validating caveats', function(t) {
  var registry = new CaveatValidatorRegistry();
  var ctx = context.Context();

  // Keep track of the validation calls when they happen.
  var seenCalls = [];

  // Register caveat validators.
  registry.register(testCaveats.CaveatThatValidates, function(fnCtx, param) {
    t.equal(fnCtx, ctx, 'Contexts should match');
    t.equal(param._type, (new testCaveats.CaveatThatValidatesData())._type,
      'Validation param has the correct type (CaveatThatValidates)');
    t.deepEqual(param, testCaveats.CaveatThatValidatesExpectedData,
      'Validation param matches expectation (CaveatThatValidates)');

    seenCalls.push('validate');

    return false; // This should be ignored, but make sure it isn't treated
    // as a failed validation.
  });
  registry.register(testCaveats.CaveatDoesntValidate, function(fnCtx, param) {
    t.equal(fnCtx, ctx, 'Contexts should match');
    t.deepEqual(param, testCaveats.CaveatDoesntValidateExpectedData.val,
      'Validation param matches expectation (CaveatDoesntValidate)');

    seenCalls.push('not validate');

    throw new Error('Validation should fail when this is thrown');
  });

  // Make calls to validate(), providing caveats.
  t.doesNotThrow(function() {
      registry.validate(
              ctx,
              caveatUtil.makeCaveat(testCaveats.CaveatThatValidates,
                         testCaveats.CaveatThatValidatesExpectedData));
    },
    'Should validate');
  t.throws(function() {
      registry.validate(
              ctx,
              caveatUtil.makeCaveat(testCaveats.CaveatDoesntValidate,
                         testCaveats.CaveatDoesntValidateExpectedData));
    },
    'Validation should fail',
    'Shouldn\'t validate');


  // Test re-registering on the same UUID. This should replace the validation
  // function.
  registry.register(testCaveats.CaveatWithCollision, function(fnCtx, param) {
    t.equal(fnCtx, ctx, 'Contexts should match');
    t.deepEqual(param, testCaveats.CaveatWithCollisionExpectedData.val,
      'Validation param matches expectation (CaveatWithCollision)');

    seenCalls.push('collision');

    throw new Error('Validation should fail when this is thrown');
  });

  t.throws(function() {
      registry.validate(
	      ctx,
              caveatUtil.makeCaveat(testCaveats.CaveatWithCollision,
                         testCaveats.CaveatWithCollisionExpectedData.val));
    },
    'Validation should fail',
    'Shouldn\'t validate after validation function is changed');

  t.deepEqual(seenCalls, ['validate', 'not validate', 'collision'],
    'All validation functions are called in the right order.');

  t.end();
});

test('Unknown caveat id', function(t) {
  var registry = new CaveatValidatorRegistry();
  var ctx = context.Context();

  t.throws(function() {
    registry.validate(ctx, {
      id: 99,
      paramVom: null
    });
  },
  'Unknown caveat id',
  'Should throw due to unknown caveat id');

  t.end();
});
