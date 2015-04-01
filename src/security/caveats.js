// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vom = require('../vom');
var vdlSecurity = require('../gen-vdl/v.io/v23/security');

module.exports = {
  createCaveat: createCaveat,
  createConstCaveat: createConstCaveat,
  createExpiryCaveat: createExpiryCaveat,
  createMethodCaveat: createMethodCaveat,
  unconstrainedUseCaveat: createConstCaveat(true)
};

function createCaveat(cavDesc, data) {
  return new vdlSecurity.Caveat({
    id: cavDesc.id,
    paramVom: vom.encode(data, cavDesc.paramType)
  });
}

function createConstCaveat(value) {
  return createCaveat(vdlSecurity.ConstCaveat, value);
}

function createExpiryCaveat(expiryTime) {
  return createCaveat(vdlSecurity.ExpiryCaveatX, expiryTime);
}

function createMethodCaveat(methods) {
  return createCaveat(vdlSecurity.MethodCaveatX, methods);
}
