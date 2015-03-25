// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

if (typeof Map === 'undefined' || typeof Set === 'undefined') {
  // Make this require an expression, so browserify won't include it.
  require('es6-' + 'shim');
}
