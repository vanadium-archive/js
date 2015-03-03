/**
 * @fileoverview Registry for caveats. Provides a mapping between caveat
 * UUIDs and validations methods.
 */

var vdl = require('../vdl');
var vom = require('../vom');
var standardCaveats = require('./standard-caveats');
var vdlSecurity = require('../v.io/v23/security');
var unwrapArg = require('../lib/unwrap-arg');

module.exports = CaveatValidatorRegistry;

/**
 * CaveatValidatorRegistry is a registry for caveats.
 * It enables registration of caveat validation functions and provides
 * provides functionality to perform validation given UUIDs
 * @constructor
 */
function CaveatValidatorRegistry() {
  this.validators = new Map();

  standardCaveats.registerDefaultCaveats(this);
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
    throw new vdlSecurity.CaveatNotRegisteredError(secCtx.context,
      'Unknown caveat id: ' + this._makeKey(caveat.id));
  }
  var reader = new vom.ByteArrayMessageReader(caveat.paramVom);
  var decoder = new vom.Decoder(reader);
  return validator.validate(secCtx, decoder.decode());
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
  var canonParam = vdl.Canonicalize.reduce(paramForValidator, paramType);
  var unwrappedParam = unwrapArg(canonParam, paramType);

  return this.validateFn(secCtx, unwrappedParam);
};