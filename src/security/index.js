// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/**
 * @summary Namespace security provides an API for the Vanadium
 * security concepts defined in {@link https://v.io/concepts/security.html}.
 * @description
 * <p>Namespace security provides an API for the Vanadium
 * security concepts defined in {@link https://v.io/concepts/security.html}.
 * </p>
 *
 * <p>The primitives and APIs defined in this package enable bi-directional,
 * end-to-end authentication between communicating parties; authorization based
 * on that authentication; and secrecy and integrity of all communication.</p>
 * <p>The Vanadium security model is centered around the concepts of principals
 * and blessings.</p>
 * <p> A principal in the Vanadium framework is a public and private key pair.
 * Every RPC is executed on behalf of a principal. <p>
 * <p> A blessing is a binding of a human-readable name to a principal, valid
 * under some caveats, given by another principal. A principal can have
 * multiple blessings bound to it. For instance, a television principal may
 * have a blessing from the manufacturer (e.g., popularcorp/products/tv) as
 * well as from the owner (e.g., alice/devices/hometv). Principals are
 * authorized for operations based on the blessings bound to them.<p>
 * <p> A principal can "bless" another principal by binding an extension of one
 * of its own blessings to the other principal. This enables delegation of
 * authority. For example, a principal with the blessing "johndoe" can delegate
 * to his phone by blessing the phone as "johndoe/phone", which in-turn can
 * delegate to the headset by blessing it as "johndoe/phone/headset".</p>
 * <p> Caveats can be added to a blessing in order to restrict the contexts in
 * which it can be used. Amongst other things, caveats can restrict the
 * duration of use and the set of peers that can be communicated with using
 * a blessing.<p>
 * @namespace
 * @name security
 * @memberof module:vanadium
 */
var extend = require('xtend');

module.exports = extend(
  require('../gen-vdl/v.io/v23/security'),{
  access: require('./access'),
  createExpiryCaveat: require('./caveats').createExpiryCaveats,
  createMethodCaveat: require('./caveats').createMethodCaveats,
  unconstrainedUse: require('./caveats').unconstrainedUse,
  createCaveat: require('./caveats').createCaveat,
});
