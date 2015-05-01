// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoveriew A leaf dispatcher that uses a single service object for
 * all suffixes
 */

/**
 * Returns a dispatcher function that will reuse the same service object
 * for all suffixes.
 * @private
 * @param {Service} service Service object.
 * @param {Authorizer} [authorizer] Optional authorizer to use.
 * @return {function} A dispatcher function that will reuse the same service
 * object.
 */
function createLeafDispatcher(service, authorizer) {
  var dispacther = function() {
    return {
      service: service,
      authorizer: authorizer,
    };
  };
  dispacther._isLeaf = true;
  return dispacther;
}

/**
 * Export module
 */
module.exports = createLeafDispatcher;
