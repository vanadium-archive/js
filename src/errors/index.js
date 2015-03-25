// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var extend = require('xtend');
var isBrowser = require('is-browser');

module.exports = extend(require('../gen-vdl/v.io/v23/verror'), {
  makeError: require('./make-errors'),
  actions: require('./actions'),
  VanadiumError: require('./vanadium-error'),
});

if (isBrowser) {
  // Extend extension errors if browser
  module.exports = extend(
    module.exports,
    require('../browser/extension-errors')
  );
}