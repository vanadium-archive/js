// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Principal stub for vanadium principals
 * @private
 */

var Deferred = require('../lib/deferred');
var Blessings = require('./blessings');
var verror = require('../gen-vdl/v.io/v23/verror');

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
 * @param {module:vanadium.context.Context} ctx The context
 * @param {string} publicKey The base64 encoded public key to bless
 * @param {Blessings} blessing The blessings
 * @param {string} extension the extension for the blessing.
 * @param {...Caveat} caveats an array of Cavaeats to restrict the blessing.
 * @param {function} cb an optional callback that will return the blessing
 * @return {Promise} a promise that will be resolved with the blessing
 */
Principal.prototype.bless = function(ctx, publicKey, blessings,
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

  var controller = this._controller;
  this._controller.bless.call(controller, ctx, publicKey,
    blessings._id, extension, caveats)
  .then(function(res) {
    var publicKey = res[0];
    var handle = res[1];
    def.resolve(new Blessings(handle, publicKey, controller));
  }).catch(function(err) {
    def.reject(err);
  });

  return def.promise;
};

/**
 * BlessSelf creates a blessing with the provided name for this principal.
 * @param {module:vanadium.context.Context} ctx The context
 * @param {String} name the name for the blessing.
 * @param {...Caveat} caveats an array of Cavaeats to restrict the blessing.
 * @param {function} cb an optional callback that will return the blessing
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

/**
 * Put to blessing store puts a blessing in the blessing store.
 * @param {module:vanadium.context.Context} ctx The context
 * @param {Blessings} blessings The blessings object
 * @param {string} pattern The blessing match pattern.
 * @param {function} cb an optional callback that will return the blessing
 * handle
 * @return {Promise} a promise that will be resolved with the blessing handle
 */
Principal.prototype.putToBlessingStore = function(
  ctx, blessings, pattern, cb) {
  var def;
  if (blessings === undefined) {
    def = new Deferred(cb);
    def.reject(new verror.InternalError(this._ctx,
      'Blessings handle not specified'));
    return def.promise;
  }
  if (pattern === undefined) {
    def = new Deferred(cb);
    def.reject(new verror.InternalError(this._ctx,
      'Pattern not specified'));
    return def.promise;
  }

  return this._controller.putToBlessingStore.call(this._controller,
    ctx, blessings._id, pattern, cb).then(function(res) {
      return res;
    });
};

Principal.prototype._loadDefaultBlessings = function() {
  var self = this;
  return this._controller.getDefaultBlessings(this._ctx).
    then(function(res) {
      self.defaultBlessings = res;
  });
};
module.exports = Principal;
