// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var mercury = require('mercury');
var settings = require('./components/settings');
var state;

module.exports = state = mercury.struct({
  error: mercury.value(null),
  settings: settings().state
});

