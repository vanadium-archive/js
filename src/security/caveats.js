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
  unconstrainedUse: createConstCaveat(true)
};

/**
 * createCaveat returns a [Caveat]{@link module:vanadium.security.Caveat}
 * that requires validation by the validation function correponding
 * to cavDesc and uses the provided parameters.
 * @param {module:vanadium.security.CaveatDescriptor} cavDesc The type of
 * caveat that is being created
 * @param {*} data The data for the caveat
 * @return module:vanadium.security.Caveat
 * @memberof module:vanadium.security
 */
function createCaveat(cavDesc, data) {
  return new vdlSecurity.Caveat({
    id: cavDesc.id,
    paramVom: vom.encode(data, cavDesc.paramType)
  });
}

function createConstCaveat(value) {
  return createCaveat(vdlSecurity.ConstCaveat, value);
}

/**
 * createExpiryCaveat returns a [Caveat]{@link module:vanadium.security.Caveat}
 * that validates iff the current time is before t
 * @param {date} expiryTime The time the caveat expires
 * @returns module:vanadium.security.Caveat
 * @memberof module:vanadium.security
 */
function createExpiryCaveat(expiryTime) {
  return createCaveat(vdlSecurity.ExpiryCaveatX, expiryTime);
}

/**
 * createMethodCaveat returns a [Caveat]{@link module:vanadium.security.Caveat}
 * that validates iff the method being invoked by the peer is listed in
 * methods array passed in.
 * @param {array<string>} methods The methods that are allowed.
 * @returns module:vanadium.security.Caveat
 * @memberof module:vanadium.security
 */
function createMethodCaveat(methods) {
  return createCaveat(vdlSecurity.MethodCaveatX, methods);
}

/**
 * unconstrainedUse returns a [Caveat]{@link module:vanadium.security.Caveat}
 * that never fails to validate.
 * @name unconstrainedUse
 * @returns module:vanadium.security.Caveat
 * @memberof module:vanadium.security
 */

