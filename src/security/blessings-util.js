// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var runtimeFromContext = require('../../src/runtime/runtime-from-context');

/**
 * @fileoverview Blessings related utilities that don't belong on the
 * Blessings object.
 * @private
 */

module.exports = {
  unionOfBlessings: unionOfBlessings
};

/**
 * A callback that is called with either an error or a
 * [Blessings]{@link module:vanadium.security~Blessings} object.
 * @callback module:vanadium.security~blessingsCb
 * @param {Error} err If set, the error that occured.
 * @param {module:vanadium.security~Blessings} blessings The blessings result.
 */

/**
* unionOfBlessings returns a Blessings object that carries the union of the
* provided blessings.
* @param {module:vanadium.context.Context} ctx The context.
* @param {...string} blessingsList The blessings to join
* @param {module:vanadium.security~blessingsCb} cb An optional
* callback that will return the blessing.
* @return {Promise<module:vanadium.security~Blessings>} A promise that will
* be resolved with the blessing.
* @memberof module:vanadium.security
*/
function unionOfBlessings(ctx /*, blessingsA, blessingsB, ..., cb*/) {
   var args = Array.prototype.slice.call(arguments);
   args.shift(); // remove ctx
   var cb;
   if (args.length > 0 && typeof args[args.length - 1] === 'function') {
     cb = args.pop();
   }

   var blessingsList = args;
   var handleList = blessingsList.map(function(blessings) {
     return blessings._id;
   });

   var runtime = runtimeFromContext(ctx);
   return runtime._controller.unionOfBlessings(ctx, handleList, cb);
}
