/**
 * @fileoverview Caveats for blessings
 * @private
 */

module.exports = {
  MethodCaveat: MethodCaveat,
};

/**
 * A caveat that is only valid for calling one of a list of methods.
 * @constructor
 * @param{Array} methods the methods that the blessee can call.
 */
function MethodCaveat(methods) {
  this._methods = methods;
}

MethodCaveat.prototype.toJSON = function() {
  return {
    _type: 'MethodCaveat',
    data: this._methods
 };
};
