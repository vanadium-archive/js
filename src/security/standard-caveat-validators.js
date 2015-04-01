// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vdlSecurity = require('../gen-vdl/v.io/v23/security');

// Register the default caveats from the security package.
module.exports = {
  registerDefaultCaveats: registerDefaultCaveats
};

function registerDefaultCaveats(registry) {
  registry.register(vdlSecurity.ConstCaveat,
    constCaveatValidator);
  registry.register(vdlSecurity.ExpiryCaveatX,
    expiryCaveatValidator);
  registry.register(vdlSecurity.MethodCaveatX,
    methodCaveatValidator);
}


function constCaveatValidator(call, value, cb) {
  if (!value) {
    return cb(new vdlSecurity.ConstCaveatValidationError(call.context));
  }
  cb();
}

function expiryCaveatValidator(call, expiry, cb) {
  var now = Date.now();
  if (now > expiry.getTime()) {
    return cb(new vdlSecurity.ExpiryCaveatValidationError(call.context,
      now, expiry));
  }
  cb();
}

function methodCaveatValidator(call, methods, cb) {
  if (!call.method || methods.length === 0) {
    return cb();
  }
  for (var i = 0; i < methods.length; i++) {
    if (call.method === methods[i]) {
      return cb();
    }
  }
  return cb(new vdlSecurity.MethodCaveatValidationError(call.context,
    call.method, methods));
}
