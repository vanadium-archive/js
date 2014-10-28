/**
 * @fileoverview Blessings stub of veyron identities
 */

var MessageType = require('../proxy/message_type');

/**
 * Blessings encapsulate the set of blessings (human-readable strings) have
 * been bound to a principal in a specific context.
 */
function Blessings(id, key, proxy) {
  this._id = id;
  this._count = 1;
  this._proxy = proxy;
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
Blessings.prototype.release = function() {
  this._count--;
  if (this._count === 0) {
    var message = JSON.stringify(this._id);
    this._proxy.sendRequest(message, MessageType.UNLINK_BLESSINGS, null,
        this._proxy.nextId());
  }
};

Blessings.prototype.toJSON = function() {
  return {
    id: this._id,
    key: this._key,
  };
};

module.exports = Blessings;
