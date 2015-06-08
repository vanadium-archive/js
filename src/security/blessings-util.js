// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Blessings = require('../../src/security/blessings');
var makeError = require('../../src/verror/make-errors');
var actions = require('../../src/verror/actions');

var InvalidUnionError = makeError('v.io/v23/security.errInvalidUnion',
  actions.NO_RETRY, {
    'en':
     '{1:}{2:} cannot create union of blessings bound to different public keys',
  }, []);


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
* @return {module:vanadium.security~Blessings} A blessing object consisting
* of the union of the input.
* @memberof module:vanadium.security
*/
function unionOfBlessings(ctx /*, blessingsA, blessingsB, ...*/) {
  var blessingsList = Array.prototype.slice.call(arguments, 1);

  blessingsList = blessingsList.filter(function(blessings) {
    return !!blessings;
  });

  switch(blessingsList.length) {
    case 0:
      return null;
    case 1:
      return blessingsList[0];
  }

  var firstKey = blessingsList[0].publicKey;
  var chains = [];
  for (var i = 0; i < blessingsList.length; i++) {
    var blessings = blessingsList[i];
    if (JSON.stringify(blessings.publicKey) !== JSON.stringify(firstKey)) {
      throw new InvalidUnionError();
    }
    chains = chains.concat(blessings.chains);
  }

  // Sort for prettier and more consistent output.
  chains = chains.sort(chainSorter);

  return new Blessings({
    publicKey: firstKey,
    certificateChains: chains
  });
}

// Provide some stability by sorting the chain list.
// The chains are first ordered by length, followed by the the result
// of comparing the first differing extension.
function chainSorter(a, b) {
  if (a.length !== b.length) {
    return a.length > b.length;
  }

  for (var i = 0; i < a.length; i++) {
    var aext = a[i].extension;
    var bext = b[i].extension;
    if (aext !== bext) {
      return aext > bext;
    }
  }

  return false;
}
