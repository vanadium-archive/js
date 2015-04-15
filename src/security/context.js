// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
var ContextKey = require('./../runtime/context-key');
var securityCallKey = new ContextKey();

module.exports = {
  getSecurityCallFromContext: getSecurityCallFromContext,
  contextWithSecurityCall: contextWithSecurityCall,
};

/**
 * Returns the
 * [SecurityCall]{@link module:vanadium.security~SecurityCall} from the
 * [Context]{@link module:vanadium.context.Context}
 * @param {module:vanadium.context.Context} ctx The context
 * @return {module:vanadium.security~SecurityCall} The security call on the
 * context or null if there is no security context
 * @memberof module:vanadium.security
 */
function getSecurityCallFromContext(ctx) {
  return ctx.value(securityCallKey);
}

function contextWithSecurityCall(ctx, call) {
  return ctx.withValue(securityCallKey, call);
}
