// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var createSecurityCall = require('../security/create-security-call');

module.exports = createServerCall;

/**
 * Create a server call object. This exists so that we can resolve blessings
 * before the user is given the object.
 * @private
 */
function createServerCall(request, blessingsManager) {
  var serverCall = new ServerCall();
  if (request instanceof ServerCall) {
    serverCall.securityCall = request.securityCall.clone();
    serverCall.grantedBlessings = request.grantedBlessings;
    return Promise.resolve(serverCall);
  } else {
    var promises = [];
    promises.push(createSecurityCall(request.call.securityCall,
      blessingsManager).then(function(securityCall) {
      serverCall.securityCall = securityCall;
    }));
    if (request.call.grantedBlessings) {
      promises.push(
        blessingsManager.blessingsFromId(request.call.grantedBlessings)
        .then(function(grantedBlessings) {
          serverCall.grantedBlessings = grantedBlessings;
        })
      );
    }
    return Promise.all(promises).then(function() {
      return serverCall;
    });
  }
}

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
 * @property {module:vanadium.security~Blessings} grantedBlessings The
 * blessings optionally granted to the server from the client through a
 * granter.
 *
 * @property {*} methodTags The tags attached to the method,
 * interface specification in VDL.
 *
 * @memberof module:vanadium.rpc
 */
function ServerCall() {
}
