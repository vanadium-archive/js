// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Blessing store stub for vanadium blessing stores
 * @private
 */

 var Promise = require('../lib/promise');
 var verror = require('../gen-vdl/v.io/v23/verror');

 module.exports = BlessingStore;

 /**
  * A callback that is called with either an error or a
  * [Blessings]{@link module:vanadium.security~Blessings} object.
  * @callback module:vanadium.security.BlessingStore~blessingsCb
  * @param {Error} err If set, the error that occured
  * @param {module:vanadium.security~Blessings} blessings The blessings result.
  */
 /**
  * @summary BlessingStore is a mapping between remote blessing string and
  * local blessing.
  * @description BlessingStore is the interface for storing blessings bound to
  * a principal and managing the subset of blessings to be presented to
  * particular peers.
  * This constructor should not be called directly. The BlessingStore can be
  * obtained from the principal object.
  * @constructor
  * @inner
  * @memberof module:vanadium.security
  */
 function BlessingStore(controller) {
   this._controller = controller;
 }

 /**
  * Sets an entry in the blessing store.
  * @param {module:vanadium.context.Context} ctx The context.
  * @param {module:vanadium.security~Blessings} blessings The blessings object.
  * @param {string} pattern The blessing match pattern.
  * @param {module:vanadium.security.BlessingStore~blessingsCb} cb an optional
  * callback that will return the blessing handle.
  * @return {Promise<module:vanadium.security~Blessings>} a promise that will
  * be resolved with the blessing handle.
  */
 BlessingStore.prototype.set = function(
   ctx, blessings, pattern, cb) {
   if (blessings === undefined) {
     return Promise.reject(new verror.BadArgError(ctx,
       'Blessings handle not specified'));
   }
   if (pattern === undefined) {
     return Promise.reject(new verror.BadArgError(ctx,
       'Pattern not specified'));
   }

   return this._controller.putToBlessingStore.call(this._controller,
     ctx, blessings._id, pattern, cb);
 };
