/**
 * @fileoverview Registry for caveats. Provides a mapping between caveat
 * UUIDs and validations methods.
 */

var reduce = require('../vdl/canonicalize').reduce;
var DecodeUtil = require('../lib/decode-util');

module.exports = CaveatValidatorRegistry;

/**
 * CaveatValidatorRegistry is a registry for caveats.
 * It enables registration of caveat validation functions and provides
 * provides functionality to perform validation given UUIDs
 * @constructor
 */
function CaveatValidatorRegistry() {
  this.validators = new Map();
}

/**
 * _makeKey generates a key for the given Uint8Array.
 * This is needed because ES6 map does === comparison and equivalent arrays
 * can be different under ===.
 * For simplicity, just return valueOf() (the array form).
 * @private
 */
CaveatValidatorRegistry.prototype._makeKey = function(bytes) {
  return bytes.valueOf();
};

/**
 * @callback ValidationFunction
 * @param {Context}The context.
 * @param {*} param Validation-function specific parameter.
 * @throws Upon failure to validate, does not throw if successful.
 */

/**
 * Register a caveat validation function
 * @param {CaveatDescriptor} cavDesc The caveat description.
 * See security/types.vdl
 * @param {ValidationFunction} validateFn The validation function.
 * e.g. function validateCaveatA(param) { ...
 */
CaveatValidatorRegistry.prototype.register = function(cavDesc, validateFn) {
  this.validators.set(
    this._makeKey(cavDesc.id),
    new CaveatValidator(cavDesc, validateFn)
  );
};

/**
 * Perform validation on a caveat.
 * @param {Context} ctx The context.
 * @param {Caveat} caveat The caveat to validate.
 * See security/types.vdl
 * @throws Upon failure to validate, does not throw if successful.
 */
CaveatValidatorRegistry.prototype.validate = function(ctx, caveat) {
  var validator = this.validators.get(this._makeKey(caveat.id));
  if (validator === undefined) {
    // TODO(bprosnitz) we should be throwing security.UnknownCaveatUuid.
    // This is dependent on having vdl-generated error id code for javascript.
    throw new Error('Unknown caveat id: ' + this._makeKey(caveat.id));
  }
  validator.validate(ctx, DecodeUtil.decode(caveat.paramVom));
};


/**
 * CaveatValidator is a helper object representating a specific caveat
 * description and function pair.
 * @private
 */
function CaveatValidator(cavDesc, validateFn) {
  this.cavDesc = cavDesc;
  this.validateFn = validateFn;
}

CaveatValidator.prototype.validate = function(ctx, paramForValidator) {
  var paramType = this.cavDesc.paramType;
  // TODO(bprosnitz) This should really be type conversion rather than
  // canonicalization. The behavior is slightly different.
  var canonData = reduce(paramForValidator, paramType);

  // TODO(bproznitz): we should be throwing security.ErrCaveatValidation.
  // This is dependent on having vdl-generated error id code for javascript.
  this.validateFn(ctx, canonData);
};
