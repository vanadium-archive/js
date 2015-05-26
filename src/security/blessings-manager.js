// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Manager of cache blessings. This differs from BlessingsCache
 * because it converts JsBlessings to Blessings objects.
 * TODO(bprosnitz) Remove this after switching to performing WireBlessings to
 * Blessings conversion with native types.
 * @private
 */

var BlessingsCache = require('../security/blessings-cache');
var Blessings = require('../security/blessings');


module.exports = BlessingsManager;

/*
 * TODO(bprosnitz) Replace this with just BlessingsCache after switching
 * to using native type conversion with blessings.
 */
/*
 * @summary Manager of blessings received from WSPR.
 * @constructor
 * @inner
 */
function BlessingsManager(controller) {
  this._blessingsCache = new BlessingsCache();
  this._controller = controller;
}

BlessingsManager.prototype.blessingsFromId = function(id) {
  var controller = this._controller;
  return this._blessingsCache.blessingsFromId(id).then(function(jsBless) {
    if (!jsBless) {
      return null;
    }
    return new Blessings(jsBless.handle, jsBless.publicKey, controller);
  });
};

BlessingsManager.prototype.addBlessings = function(addMessage) {
  return this._blessingsCache.addBlessings(addMessage);
};

BlessingsManager.prototype.deleteBlessings = function(deleteMessage) {
  return this._blessingsCache.deleteBlessings(deleteMessage);
};
