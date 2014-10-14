/**
 * @fileoverview PublicId stub of veyron identities
 */

var MessageType = require('../proxy/message_type');
var blessingMatches = require('./blessing_matching');

/**
 * The public portion of a veyron identity.
 */
function PublicId(names, id, key, proxy) {
  this.names = names;
  this._id = id;
  this._count = 1;
  this._proxy = proxy;
  this._key = key;
}

/**
 * Returns whether the PublicId matches a principal pattern. There
 * are basically two types of patterns.  A fixed name pattern
 * looks like 'a/b' and matches names 'a/b' and 'a', but not
 * 'a/b/c', 'aa', or 'a/bb'. 'a' is considered a match because
 * the owner of 'a' can trivially create the name 'a/b'.  A star
 * pattern looks like 'a/b/*' and it matches anything that 'a/b' matches
 * as well as any name blessed by 'a/b', i.e 'a/b/c', 'a/b/c/d'.
 * @param {string} pattern The pattern to match against.
 * @return {boolean} Returns true iff the PublicId has a name that matches
 * the pattern passed in.
 */
PublicId.prototype.match = function(pattern) {
  if (pattern === '' || !pattern) {
    return false;
  }
  for (var i = 0; i < this.names.length; i++) {
    if (blessingMatches(this.names[i], pattern)) {
      return true;
    }
  }
  return false;
};

/**
 * Increments the reference count on the PublicId.  When the reference count
 * goes to zero, the PublicId will be removed from the cache in the go code.
 */
PublicId.prototype.retain = function() {
  this._count++;
};

/**
 * Decrements the reference count on the PublicId.  When the reference count
 * goes to zero, the PublicId will be removed from the cache in the go code.
 */
PublicId.prototype.release = function() {
  this._count--;
  if (this._count === 0) {
    var message = JSON.stringify(this._id);
    this._proxy.sendRequest(message, MessageType.UNLINK_ID, null,
        this._proxy.nextId());
  }
};

PublicId.prototype.toJSON = function() {
  return {
    id: this._id,
    names: this.names,
    key: this._key
  };
};

module.exports = PublicId;
