// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var unwrap = require('../vdl/type-util').unwrap;
var vlog = require('../lib/vlog');
var Deferred = require('../lib/deferred');

/**
 * @fileoverview A cache of blessings, used in conjunction with the cache
 * in WSPR (principal/cache.go) to reduce the number of times blessings must
 * be sent across the wire.
 * This is kept in sync with the WSPR cache.
 * @private
 */

module.exports = BlessingsCache;

/**
 * @summary Cache of blessings received from WSPR.
 * @description This cache is kept in sync with WSPR to reduce the
 * number of times that blessings must be sent across the wire.
 * @constructor
 * @private
 */
function BlessingsCache() {
 // Each entry has the following fields (which may or may not exist):
 // - deferredBlessings: a deferred object whose promise resolves to the
 // blessings
 // - refCount: number of references to the blessings
 // - deleteAfter: delete the entry after this number of blessings
 this._entries = {};
}

/**
 * @summary addBlessings adds blessings to the blessings cache.
 * @param {wspr.internal.principal.BlessingsCacheAddMessage} addMessage
 */
BlessingsCache.prototype.addBlessings = function(addMessage) {
  var id = this._unwrappedId(addMessage.cacheId);
  var entry = this._getOrCreateEntry(id);
  entry.deferredBlessings.resolve(addMessage.blessings);
};

/**
 * @summary deleteBlessings removes blessings from the blessings cache.
 * @param {wspr.internal.principal.BlessingsCacheAddMessage} addMessage
 */
BlessingsCache.prototype.deleteBlessings = function(deleteMessage) {
  var id = this._unwrappedId(deleteMessage.cacheId);
  var entry = this._getOrCreateEntry(id);
  entry.deleteAfter = deleteMessage.deleteAfter;

  this._deleteIfNoLongerNeeded(id);
};

/**
 * @summary blessingsFromId looks up a blessing by id or waits for it if it
 * has not been put in the cache yet
 * @param {wspr.internal.principal.BlessingsId} blessingsId
 */
BlessingsCache.prototype.blessingsFromId = function(blessingsId) {
  var id = unwrap(blessingsId);

  if (typeof id !== 'number') {
    throw new Error('Expected numeric blessings id');
  }
  if (id === 0) {
    // Zero is not a valid id.
    // TODO(bprosnitz) Replace this with null once we switch to full blessings
    // objects. It is currently a number because there are no optional numbers
    // now in VDL.
    return Promise.resolve(null);
  }

  var entry = this._getOrCreateEntry(id);
  var cache = this;
  return entry.deferredBlessings.promise.then(function(blessings) {
    cache._increaseRefCount(id);
    cache._deleteIfNoLongerNeeded(id);
    return blessings;
  });
};

BlessingsCache.prototype._increaseRefCount = function(cacheId) {
  var entry = this._entries[cacheId];
  if (!entry) {
    throw new Error('Unexpectedly got id of missing entry');
  }
  entry.refCount++;
};

BlessingsCache.prototype._deleteIfNoLongerNeeded = function(cacheId) {
  var entry = this._entries[cacheId];
  if (!entry) {
    throw new Error('Entry unexpectedly not present');
  }

  if (entry.refCount >= entry.deleteAfter) {
    if (entry.refCount > entry.deleteAfter) {
      vlog.logger.warn('Got more references than expected');
    }
    if (entry.waiting) {
      vlog.logger.warn(
        'There should not be anything waiting on entry to be deleted');
    }
    delete this._entries[cacheId];
  }
};

BlessingsCache.prototype._getOrCreateEntry = function(cacheId) {
  if (!this._entries[cacheId]) {
    this._entries[cacheId] = {
      refCount: 0,
      deferredBlessings: new Deferred()
    };
  }
  return this._entries[cacheId];
};

BlessingsCache.prototype._unwrappedId = function(cacheId) {
  var id = unwrap(cacheId);
  if (typeof id !== 'number') {
    throw new Error('Got non-numeric id');
  }
  if (id <= 0) {
    throw new Error('Unexpected non-positive id ' + id);
  }
  return id;
};
