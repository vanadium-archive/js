/**
 * @fileoverview Caveats for blessings
 */

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

/**
 * A caveat that is only valid for talking a set of identities that
 * match a given set of principal patterns.
 * @constructor
 * @param {Array} pattern an array of name patterns that the blessee
 * can talk to.
 */
function PeerBlessingsCaveat(patterns) {
  this._patterns = patterns;
}

PeerBlessingsCaveat.prototype.toJSON = function() {
  return {
    _type: 'PeerBlessingsCaveat',
    data: this._patterns
  };
};

module.exports = {
  MethodCaveat: MethodCaveat,
  PeerBlessingsCaveat: PeerBlessingsCaveat
};
