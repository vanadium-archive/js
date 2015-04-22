// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = ContextKey;
var nextKey = 0;
/**
 * @summary A ContextKey can be used as a key in the value/withValue
 * methods of Context.
 * @description Modules that want to attach data to the context should
 * first construct a key, then use that key whenever they want to
 * store or retrieve their data from the context.
 * @constructor
 * @memberof module:vanadium.context
 */
function ContextKey() {
  if (!(this instanceof ContextKey)) {
    return new ContextKey();
  }
  this._key = nextKey;
  nextKey++;
}
