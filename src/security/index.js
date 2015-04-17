// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
/**
 * @summary Namespace security defines the API for identity, authentication,
 * and authorization
 * @description
 * <p>Namespace security defines the API for identity, authentication,
 * and authorization</p>
 *
 * <p>The primitives and APIs defined in this package enable bi-directional,
 * end-to-end authentication between communicating parties; authorization based
 * on that authentication and a database of access rights
 * ([AccessLists]{@link module:vanadium.security.access.AccessList}); and
 * secrecy and integrity of all communication.</p>
 *
 * <p>In addition to authorization based on AccessLists, vanadium supports
 * "blessings" which are typically used by one principal (e.g. alice/phone/app)
 * to delegate constrained authority (often short-lived) to another principal
 * (e.g. bob/tv). </p>
 *
 * <p>A "principal" refers to any entity capable of making or receiving RPCs.
 * Each principal has a unique (public, private) key pair and public key
 * cryptography is used to implement the vanadium security model. </p>
 *
 * <h2>Delegation</h2>
 * <p>Principals have a set of "blessings" in the form of human-readable
 * strings that represent delegations from other principals. Blessings are
 * cryptographically bound to the principal's public key. Slashes in this
 * string are used to represent a chain of delegations. For example, a
 * principal with the blessing "johndoe" can delegate to his phone by blessing
 * the phone as "johndoe/phone", which in-turn can delegate to the headset by
 * blessing it as "johndoe/phone/headset". This headset principal may have
 * other blessings bound to it as well. For example, one from the manufacturer
 * ("manufacturer/model"), one from the developer of the software
 * ("developer/software/headset") etc. </p>
 * <p>The "root" principal of a delegation chain (i.e., a blessing) is
 * identified by their public key. For example, let's say a principal P1
 * presents a blessing "a/b/c" to another principal P2. P2 will consider this
 * blessing valid iff the public key of the principal that generated the
 * blessing "a" (root of the delegation chain) is recognized as an authority on
 * the blessing "a/b/c" by P2. This allows authorizations for actions to be
 * based on the blessings held by the principal attempting the action.
 * Cryptographic proof of the validity of blessings is done through chains of
 * certificates encapsulated in the {@link Blessings}.
 *
 * <h2>Caveats and Discharges</h2>
 * <p>Blessings are typically granted under specific restrictions. For example,
 * a principal with the blessing "johndoe" can bless another principal with
 * "johndoe/friend" allowing the other principal to use the blessing with the
 * caveat that it is valid only for the next 5 minutes and cannot be used to
 * communicate with the banking service.<p>
 *
 * <p>When a principal presents a blessing to another principal in order to
 * authorize an action, the authorizing principal verifies that all caveats
 * have been satisfied. Caveats (lifetime of the blessing, set of methods that
 * can be invoked etc.) are typically verified based on the context of the
 * action (time of request, method being invoked etc.). However, validation of
 * some caveats can be offloaded to a party other than the requesting or
 * authorizing principal. Thus, blessings can be made with "third-party
 * caveats" whose validation requires a "proof" of the restriction being
 * satisfied to be issued by the third party. The representation of a "proof"
 * is referred to as a "discharge" (borrowing the term from proof theory,
 * https://proofwiki.org/wiki/Definition:Discharged_Assumption).
 * NewPublicKeyCaveat provides a means to offload validation of a restriction
 * to a third party.<p>
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
