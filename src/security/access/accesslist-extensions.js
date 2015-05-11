// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/*
 * Extends the vdl generated AccessList by adding additional methods.
 * @fileoverview
 */

var blessingMatches = require('./blessing-matching');
var AccessList = require('../../gen-vdl/v.io/v23/security/access').AccessList;

/**
 * Returns true iff the AccessList grants access to a principal that
 * presents blessings.
 * (i.e., if at least one of the blessings matches the AccessList).
 * @param {string[]} blessings Presented blessing names.
 * @return {boolean}
 * @name includes
 * @method
 * @memberof module:vanadium.security.access.AccessList.prototype
 */
 AccessList.prototype.includes = function(blessings) {
  var accessList = this;

  // Remove the blessing that are blacklisted.
  var unblacklistedNames = blessings.filter(function(blessing) {
    return accessList.notIn.every(function(pattern) {
      return !blessingMatches(blessing, pattern);
    });
  });
  // Check the remaining blessing for a match in the white list.
  return unblacklistedNames.some(function(blessing) {
    return accessList.in.some(function(pattern) {
      return blessingMatches(blessing, pattern);
    });
  });
 };