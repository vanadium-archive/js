// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Helpers for performing reflection on user-defined services
 * in a consistent way.
 * @private
 */

module.exports = {
  isPublicMethod: isPublicMethod
};

/**
 * isPublicMethod - Test wether a key on a service object is a valid method
 * that should be refelcetd.
 * @private
 * @param  {String} key - The attribute key to test on the service object.
 * @param  {Object} service - The service object.
 * @return {Boolean} valid - Wether or not the method should be reflected.
 */
function isPublicMethod(key, service) {
  // Not a valid method name if key is falsey (length 0, null, etc.)
  if (!key) {
    return false;
  }

  var isPrefixed = key[0] === '_';
  var isFunction = typeof service[key] === 'function';

  return !isPrefixed && isFunction;
}
