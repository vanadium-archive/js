// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Principal stub for vanadium principals
 * @private
 */

var Deferred = require('../lib/deferred');
var Blessings = require('./blessings');

/**
 * @summary Principal represents an entity capable of making or receiving RPCs.
 * @description <p>Principal represents an entity capable of making or receiving
 * RPCs. Principals have a unique (public, private) key pair, have blessings
 * bound to them and can bless other principals.</p>.
 * <p>This constructor should not be used explicitly.  Instead, use
 * {@link Runtime#principal}
 * @constructor
 */
function Principal(ctx, controller) {
  this._controller = controller;
  this._ctx = ctx;
}

/**
 * <p>Bless binds extensions of blessings held by this principal to
 * another principal (represented by its public key).</p>
 *
 * <p>For example, a principal with the blessings "google/alice"
 * and "v23/alice" can bind the blessings "google/alice/friend"
 * and "v23/alice/friend" to another principal using:</p>
 * <pre>
 * bless(ctx, <other public key>, <google/alice, v23/alice>, 'friend', ...)
 * </pre>
 * @param {Context} ctx: The context
 * @param {PublicKey} publicKey: The public key to bless
 * @param {BlessingsHandle} blessingsHandle: Handle to the blessings
 * @param {String} extension: the extension for the blessing.
 * @param {...Caveat} caveats: an array of Cavaeats to restrict the blessing.
 * @param {function} cb: an optional callback that will return the blessing
 * @return {Promise} a promise that will be resolved with the blessing
 */
Principal.prototype.bless = function(ctx, publicKey, blessingsHandle,
  extension, firstCaveat /*, ...moreCaveats, cb*/) {
  // Extract the callback.
  var cb;
  var args = Array.prototype.slice.call(arguments);
  if (args.length > 0 &&
    typeof args[args.length - 1] === 'function') {
    cb = args[args.length - 1];
    args.pop();
  }

  var def = new Deferred(cb);

  // We must have at least one caveat.
  if (typeof firstCaveat !== 'object') {
    def.reject('At least one caveat must be specified. To bless without ' +
    'adding restrictions, use UnconstrainedUseCaveat');
    return def.promise;
  }

  var caveats = args.slice(4);

  this._controller.bless.call(this._controller, ctx, publicKey,
    blessingsHandle, extension, caveats)
  .then(function(res) {
    var publicKey = res[0];
    var handle = res[1];
    def.resolve(new Blessings(handle, publicKey, this._controller));
  }).catch(function(err) {
    def.reject(err);
  });

  return def.promise;
};

/**
 * BlessSelf creates a blessing with the provided name for this principal.
 * @param {Context} ctx: The context
 * @param {String} name: the name for the blessing.
 * @param {...Caveat} caveats: an array of Cavaeats to restrict the blessing.
 * @param {function} cb: an optional callback that will return the blessing
 * @return {Promise} a promise that will be resolved with the blessing
 */
Principal.prototype.blessSelf = function(ctx, name /*, ...caveats, cb*/) {
  // Extract the callback.
  var cb;
  var args = Array.prototype.slice.call(arguments);
  if (args.length > 0 &&
    typeof args[args.length - 1] === 'function') {
    cb = args[args.length - 1];
    args.pop();
  }

  var def = new Deferred(cb);

  var caveats = args.slice(2);

  this._controller.blessSelf.call(this._controller, ctx, name, caveats)
  .then(function(res) {
    var publicKey = res[0];
    var handle = res[1];
    def.resolve(new Blessings(handle, publicKey, this._controller));
  }).catch(function(err) {
    def.reject(err);
  });

  return def.promise;
};

module.exports = Principal;
