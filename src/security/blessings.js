/**
 * @fileoverview Blessings stub of vanadium identities
 * @private
 */

var vlog = require('../lib/vlog');

/**
 * Blessings encapsulate the set of blessings (human-readable strings) have
 * been bound to a principal in a specific context.
 * @constructor
 */
function Blessings(id, key, controller) {
  this._id = id;
  this._count = 1;
  this._controller = controller;
  this._key = key;
}

/**
 * Increments the reference count on the Blessings.  When the reference count
 * goes to zero, the Blessings will be removed from the cache in the go code.
 */
Blessings.prototype.retain = function() {
  this._count++;
};

/**
 * Decrements the reference count on the Blessings.  When the reference count
 * goes to zero, the Blessings will be removed from the cache in the go code.
 */
Blessings.prototype.release = function(ctx) {
  this._count--;
  if (this._count === 0) {
    this._controller.unlinkJSBlessings(ctx, this._id).catch(function(err) {
      vlog.logger.warn('Ignoring failure while cleaning up blessings: ' + err);
    });
  }
};

Blessings.prototype.toJSON = function() {
  return {
    id: this._id,
    key: this._key,
  };
};

module.exports = Blessings;
