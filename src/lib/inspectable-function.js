// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file defines a helper to call a function and introspect its metadata.
// It allows us to pass a function around with its precomputed ArgInspector
// metadata.

module.exports = InspectableFunction;

var ArgInspector = require('../lib/arg-inspector');
var inherits = require('inherits');

/**
 * InspectableFunction represents an invocable function with extra metadata.
 * @private
 * @constructor
 * @param {Function} fn The function
 */
function InspectableFunction(fn) {
  this.fn = fn;
  ArgInspector.apply(this, arguments);
  Object.freeze(this);
}

inherits(InspectableFunction, ArgInspector);

/**
 * Call the function represented by InspectableFunction.
 * Args and return value are the same as Function.apply.
 * @private
 */
InspectableFunction.prototype.apply = function(self, args) {
  return this.fn.apply(self, args);
};
