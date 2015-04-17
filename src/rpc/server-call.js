// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var SecurityCall = require('../security/call');
var Blessings = require('../security/blessings');

module.exports = ServerCall;

/**
 * @summary
 * A ServerCall is a context.Context subclass that includes additional
 * information about an ongoing server call.
 * @description
 * <p>Private Constructor, an instance of ServerCall is passed to every service
 * method as the first argument.</p>
 * @inner
 * @constructor
 *
 * @property {module:vanadium.security~SecurityCall} securityCall The
 * Security Call for the request.
 *
 * @property {*} methodTags The tags attached to the method,
 * interface specification in VDL.
 *
 * @memberof module:vanadium.rpc
 */
function ServerCall(request, controller) {
  if (!(this instanceof ServerCall)) {
    return new ServerCall(request, controller);
  }

  if (request instanceof ServerCall) {
    this.securityCall = request.securityCall.clone();
    this.grantedBlessings = request.grantedBlessings;
  } else {
    this.securityCall = new SecurityCall(request.call.securityCall,
                                       controller);
    if (request.call.grantedBlessings) {
      this.grantedBlessings = new Blessings(
        request.call.grantedBlessings.handle,
        request.call.grantedBlessings.publicKey,
        controller);
    }
  }
}
