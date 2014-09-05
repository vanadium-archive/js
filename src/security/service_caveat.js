/**
 * @fileoverview Service Caveats that wraps a caveat with a service
 * restriction.
 */

/**
 * A Service Caveat used for blessing
 * @constructor
 * @param {String} pattern the principal pattern for identities with which to
 * this caveat.
 * @param {Object} caveat the caveat data.
 */
function ServiceCaveat(pattern, caveat) {
  this.service = pattern;
  this.caveat = caveat;
}

ServiceCaveat.prototype.toJSON = function() {
  var object = this.caveat.toJSON();
  object.service = this.service;
  return object;
};

module.exports = ServiceCaveat;
