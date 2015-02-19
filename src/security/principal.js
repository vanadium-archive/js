/**
 * @fileoverview Principal stub for veyron principals
 * @private
 */

var Deferred = require('../lib/deferred');
var Blessings = require('./blessings');
var time = require('../v.io/core/veyron2/vdl/vdlroot/src/time');

/**
 * Principal represents an entity capable of making or receiving RPCs.
 * @constructor
 */
function Principal(ctx, controller) {
  this._controller = controller;
  this._ctx = ctx;
}

/**
 * Blesses the blessee's public key with the given caveats.
 * @param {Blessings} blessee: a blessing on the public key to bless.
 * @param {String} extension: the extension for the blessing.
 * @param {Number} duration: the duration of the blessing in milliseconds.
 * @param {Array} caveats: an array of Cavaeats to restrict the blessing.
 * @papram {function} cb an optional callback that will return the blessing
 * @return {Promise} a promise that will be resolved with the blessing
 */
Principal.prototype.bless = function(blessee, extension, duration, caveats,
                                     cb) {
  var def = new Deferred(cb);
  if (!(blessee instanceof Blessings)) {
    def.reject(new Error('blessee should be of type Blessings'));
    return def.promise;
  }

  var vdlDuration = new time.Duration({
    seconds: Math.floor(duration / 1000),
    nano: (duration % 1000) * 1000000
  });

  var controller = this._controller;
  controller.blessPublicKey(
    this._ctx, blessee._id, caveats, vdlDuration, extension, 
    function(err, id, key) {
      if (err !== null) {
        def.reject(err);
      } else {
        def.resolve(new Blessings(id, key, controller));
      }
    });
  return def.promise;
};

module.exports = Principal;
