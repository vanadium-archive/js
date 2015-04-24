// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/**
 * @fileoverview The Allow Everyone authorizer
 * @private
 */

module.exports = authorizer;

/**
 * @function
 * @name allowEveryoneAuthorizer
 * @summary The allowEveryoneAuthorizer is an authorizer that allows access to
 * every user, regardless of their blessings.
 * @description WARNING: This authorizer provides NO security whatsoever. It
 * should be used only in tests or during development, or in applications that
 * do not require any authorization.
 * @memberof module:vanadium.security.access
 * @return {module:vanadium.security.Authorize} An authorizer which allows
 * everybody.
 */
function authorizer() {
  return function authorize(ctx, call) {
    return;
  };
}
