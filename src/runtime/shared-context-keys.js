// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var ContextKey = require('./context-key');
/**
 * Key for name of the component
 * @private
 */
module.exports.COMPONENT_NAME = new ContextKey();

/**
 * Key for the language id
 * @private
 */
module.exports.LANG_KEY = new ContextKey();

/**
 * Key for the op
 * @private
 */
module.exports.OP = new ContextKey();
