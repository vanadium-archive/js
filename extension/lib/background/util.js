// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = {
  getOrigin: getOrigin
};

// Parse a url and return the origin.
function getOrigin(url) {
  var URL = require('url');
  var parsed = URL.parse(url);
  return parsed.protocol + '//' + parsed.host;
}
