// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview a set of wrapped primitives
 * @private
 */

module.exports = {};

var Types = require('./types');
var Registry = require('./registry');

for (var typeName in Types) {
  if (Types.hasOwnProperty(typeName)) {
    var type = Types[typeName];
    if (typeof type === 'object') { // Do not export functions.
      module.exports[typeName] = Registry.lookupOrCreateConstructor(type);
    }
  }
}
