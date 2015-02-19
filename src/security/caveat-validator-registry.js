/**
 * @fileoverview Registry for caveats. Provides a mapping between caveat
 * UUIDs and validations methods.
 */

var vdl = require('../vdl');
var vom = require('../vom');
var vdlSecurity = require('../v.io/core/veyron2/security');

module.exports = CaveatValidatorRegistry;

/**
 * CaveatValidatorRegistry is a registry for caveats.
 * It enables registration of caveat validation functions and provides
 * provides functionality to perform validation given UUIDs
 * @constructor
 */
function CaveatValidatorRegistry() {
  this.validators = new Map();

  registerDefaultCaveats(this);
}

/**
 * _makeKey generates a key for the given Uint8Array.
 * This is needed because ES6 map does === comparison and equivalent arrays
 * can be different under ===.
 * @private
 */
CaveatValidatorRegistry.prototype._makeKey = function(bytes) {
  return vdl.Util.bytes2Hex(bytes);
};

/**
 * @callback ValidationFunction
 * @param {SecurityContext} The security context.
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
 * @param {SecurityContext} secCtx The context.
 * @param {Caveat} caveat The caveat to validate.
 * See security/types.vdl
 * @throws Upon failure to validate, does not throw if successful.
 */
CaveatValidatorRegistry.prototype.validate = function(secCtx, caveat) {
  var validator = this.validators.get(this._makeKey(caveat.id));
  if (validator === undefined) {
    // TODO(bprosnitz) we should be throwing security.UnknownCaveatUuid.
    // This is dependent on having vdl-generated error id code for javascript.
    throw new Error('Unknown caveat id: ' + this._makeKey(caveat.id));
  }
  var reader = new vom.ByteArrayMessageReader(caveat.paramVom);
  var decoder = new vom.Decoder(reader);
  validator.validate(secCtx, decoder.decode());
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

CaveatValidator.prototype.validate = function(secCtx, paramForValidator) {
  var paramType = this.cavDesc.paramType;
  // TODO(bprosnitz) This should really be type conversion rather than
  // canonicalization. The behavior is slightly different.
  var canonData = vdl.Canonicalize.reduce(paramForValidator, paramType);

  // TODO(bproznitz): we should be throwing security.ErrCaveatValidation.
  // This is dependent on having vdl-generated error id code for javascript.
  this.validateFn(secCtx, canonData);
};

function constCaveatValidator(secCtx, value) {
  if (!value) {
    throw new Error('failing validation in false const caveat');
  }
}

// Temporary definition of validators for unimplemented basic caveats.
// This is required to get calls that depend on these caveats to pass
// before the validator is implemented.
// TODO(bprosnitz) Add real implementations
function TEMPalwaysValidateValidator() {}

// Register the default caveats from the security package.
function registerDefaultCaveats(registry) {
  registry.register(vdlSecurity.ConstCaveat,
    constCaveatValidator);
  registry.register(vdlSecurity.UnixTimeExpiryCaveatX,
    TEMPalwaysValidateValidator);
  registry.register(vdlSecurity.MethodCaveatX,
    TEMPalwaysValidateValidator);
  registry.register(vdlSecurity.PublicKeyThirdPartyCaveatX,
    TEMPalwaysValidateValidator);
}