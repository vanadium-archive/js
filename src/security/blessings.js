// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Blessings stub of vanadium identities
 * @private
 */

var vlog = require('../lib/vlog');
var JsBlessings =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/principal').JsBlessings;

/**
 * @summary Blessings encapsulates all cryptographic operations
 * required to prove that a set of (human-readable) blessing names are
 * bound to a principal in a specific call.
 * @description <p> Blessings encapsulates all cryptographic operations
 * required to prove that a set of (human-readable) blessing names are
 * bound to a principal in a specific call.</p>
 * <p>Blessings objects are meant to be presented to other principals to
 * authenticate and authorize actions.</p>
 * @constructor
 * @memberof module:vanadium.security
 * @inner
 */
function Blessings(id, publicKey, controller) {
  this._id = id;
  this._count = 1;
  this._controller = controller;
  this.publicKey = publicKey;
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
    this._controller.unlinkBlessings(ctx, this._id).catch(function(err) {
      vlog.logger.warn('Ignoring failure while cleaning up blessings: ' + err);
    });
  }
};

Blessings.prototype.toJSON = function() {
  return {
    id: this._id,
    publicKey: this.publicKey,
  };
};

Blessings.prototype.convertToJsBlessings = function() {
  return new JsBlessings({
    handle: this._id,
    publicKey: this.publicKey
  }, true);
};

module.exports = Blessings;
