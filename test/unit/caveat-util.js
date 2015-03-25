// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vom = require('../../src/vom');
module.exports = {
  makeCaveat: makeCaveat
};

/**
 * Create a Caveat object (See security/types.vdl).
 * @param {CaveatDescriptor} descriptor The descriptor of the caveat identifier
 * and its parameter.
 * @param {any} param The parameter (of type descriptor.ParamType) to use
 * when validating.
 * @throws Upon failure to encode the parameter, does not throw if successful.
 */
function makeCaveat(descriptor, param) {
  var writer = new vom.ByteArrayMessageWriter();
  var encoder = new vom.Encoder(writer);
  encoder.encode(param);
  return {
    id: descriptor.id,
    paramVom: writer.getBytes()
  };
}