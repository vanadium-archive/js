// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var SharedContextKeys = require('./shared-context-keys');

module.exports = runtimeForContext;
/**
 * Gets the [Runtime]{@link module:vanadium~Runtime} for a given
 * [Context]{@link module:vanadium.context.Context}
 * @param {module:vanadium.context.Context} ctx The context
 * @return {module:vanadium~Runtime} the runtime for the context
 */
function runtimeForContext(ctx) {
  return ctx.value(SharedContextKeys.RUNTIME);
}

