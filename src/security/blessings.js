// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Blessings stub of vanadium identities
 * @private
 */

var unwrap = require('../vdl/type-util').unwrap;
var nativeTypeRegistry = require('../vdl/native-type-registry');
var vdlSecurity = require('../gen-vdl/v.io/v23/security');

module.exports = Blessings;

var wireBlessingsType = vdlSecurity.WireBlessings.prototype._type;
nativeTypeRegistry.registerFromNativeValue(Blessings, toWireBlessings,
  wireBlessingsType);
nativeTypeRegistry.registerFromWireValue(wireBlessingsType, fromWireBlessings);

/**
 * @summary Blessings encapsulates all cryptographic operations
 * required to prove that a set of (human-readable) blessing names are
 * bound to a principal in a specific call.
 * @description <p> Blessings encapsulates all cryptographic operations
 * required to prove that a set of (human-readable) blessing names are
 * bound to a principal in a specific call.</p>
 * <p>Blessings objects are meant to be presented to other principals to
 * authenticate and authorize actions.</p>
 * @property {module:vanadium.security.Certificate[]} chains Certificate chains.
 * @property {module:vanadium.security.PublicKey} publicKey The public key.
 * @constructor
 * @memberof module:vanadium.security
 * @inner
 */
function Blessings(wireblessings) {
  var unwrappedWireBlessings = unwrap(wireblessings);
  this.chains = unwrappedWireBlessings.certificateChains;
  if (this.chains.length === 0) {
    throw new Error('Refusing to create empty blessings object');
  }
  if (this.chains[0].length === 0) {
    throw new Error('First chain should be non-null');
  }
  this.publicKey = this.chains[0][this.chains[0].length - 1].publicKey;
}

/**
 * Get a string that describes this blessings object.
 * @return {string} A string describing the blessings.
 * @private
 */
Blessings.prototype.toString = function() {
  var parts = [];
  for (var chainidx = 0; chainidx < this.chains.length; chainidx++) {
    var chainParts = [];
    var chain = this.chains[chainidx];
    for (var certidx = 0; certidx < chain.length; certidx++) {
      var cert = chain[certidx];
      chainParts.push(cert.extension);
    }
    parts.push(chainParts.join(vdlSecurity.ChainSeparator));
  }
  return parts.join(' ');
};

function toWireBlessings(blessings) {
  if (!blessings) {
    // null is used for zero blessings
    return new vdlSecurity.WireBlessings({
      certificateChains: []
    });
  }

  if (typeof blessings !== 'object') {
    throw new Error('Expected blessings to be an object');
  }

  if (blessings.hasOwnProperty('certificateChains')) {
    // Assume this is a WireBlessings object. It isn't possible to directly
    // construct WireBlessings due to the way that native types are set up so
    // this check is used in place of instance of.
    // TODO(bprosnitz) Fix the way that native type conversion works.
    return blessings;
  }

  return new vdlSecurity.WireBlessings({
    certificateChains: blessings.chains
  });
}

function fromWireBlessings(wireblessings) {
  if (typeof wireblessings !== 'object') {
    throw new Error('Expected wire blessings to be an object');
  }

  if (wireblessings instanceof Blessings) {
    return wireblessings;
  }

  if (wireblessings.certificateChains.length === 0) {
    return null;
  }

  return new Blessings(wireblessings);
}
