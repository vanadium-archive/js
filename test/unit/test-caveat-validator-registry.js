var test = require('prova');
var CaveatValidatorRegistry =
  require('../../src/security/caveat-validator-registry');
var context = require('../../src/runtime/context');
var EncodeUtil = require('../../src/lib/encode-util');
var testCaveats = require('../vdl-out/javascript-test/security/caveat/caveat');

/**
 * Create a Caveat object (See security/types.vdl).
 * @param {CaveatDescriptor} descriptor The descriptor of the caveat identifier
 * and its parameters.
 * @param {any} params The parameters (of type descriptor.ParamsType) to use
 * when validating.
 * @throws Upon failure to encode the parameters, does not throw if successful.
 */
function makeCaveat(descriptor, params) {
  return {
    id: descriptor.id,
    paramsVom: EncodeUtil.encode(params)
  };
}

test('Validating caveats', function(t) {
  var registry = new CaveatValidatorRegistry();
  var ctx = context.Context();

  // Keep track of the validation calls when they happen.
  var seenCalls = [];

  // Register caveat validators.
  registry.register(testCaveats.CaveatThatValidates, function(fnCtx, params) {
    t.equal(fnCtx, ctx, 'Contexts should match');
    t.equal(params._type, (new testCaveats.CaveatThatValidatesData())._type,
      'Validation params has the correct type (CaveatThatValidates)');
    t.deepEqual(params, testCaveats.CaveatThatValidatesExpectedData,
      'Validation params matches expectation (CaveatThatValidates)');

    seenCalls.push('validate');

    return false; // This should be ignored, but make sure it isn't treated
    // as a failed validation.
  });
  registry.register(testCaveats.CaveatDoesntValidate, function(fnCtx, params) {
    t.equal(fnCtx, ctx, 'Contexts should match');
    t.deepEqual(params, testCaveats.CaveatDoesntValidateExpectedData,
      'Validation params matches expectation (CaveatDoesntValidate)');

    seenCalls.push('not validate');

    throw new Error('Validation should fail when this is thrown');
  });

  // Make calls to validate(), providing caveats.
  t.doesNotThrow(function() {
      registry.validate(
	      ctx,
              makeCaveat(testCaveats.CaveatThatValidates,
                         testCaveats.CaveatThatValidatesExpectedData));
    },
    'Should validate');
  t.throws(function() {
      registry.validate(
              ctx,
              makeCaveat(testCaveats.CaveatDoesntValidate,
                         testCaveats.CaveatDoesntValidateExpectedData));
    },
    'Validation should fail',
    'Shouldn\'t validate');


  // Test re-registering on the same UUID. This should replace the validation
  // function.
  registry.register(testCaveats.CaveatWithCollision, function(fnCtx, params) {
    t.equal(fnCtx, ctx, 'Contexts should match');
    t.deepEqual(params, testCaveats.CaveatWithCollisionExpectedData,
      'Validation params matches expectation (CaveatWithCollision)');

    seenCalls.push('collision');

    throw new Error('Validation should fail when this is thrown');
  });

  t.throws(function() {
      registry.validate(
	      ctx,
              makeCaveat(testCaveats.CaveatWithCollision,
                         testCaveats.CaveatWithCollisionExpectedData));
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
      paramsVom: null
    });
  },
  'Unknown caveat id',
  'Should throw due to unknown caveat id');

  t.end();
});
