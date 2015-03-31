// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var extend = require('xtend');

module.exports = extend(
  require('../gen-vdl/v.io/v23/security'),
  require('../gen-vdl/v.io/v23/security/access'), {
  aclAuthorizer: require('./acl-authorizer')
});
