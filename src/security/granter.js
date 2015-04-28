// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Type definition of granter callback.
 * @private
 */

/**
 * A granter function allows a client to provide blessings to a server when
 * making an RPC. Those blessings can then be used by the server to access
 * other Vanadium services on behalf of the client. Granter callbacks are
 * passed to a call through a [callOption]{@link
 * module:vanadium.rpc~Client#callOption}.
 * @callback module:vanadium.security~GranterFunction
 * @param {module:vanadium.context.Context} ctx A context.
 * @param {module:vanadium.security~SecurityCall} call A SecurityCall.
 * @param {module:vanadium.security~Principal~blessingsCb} cb A callback called
 * with either an error or a [Blessings]{@link
 * module:vanadium.security~Blessings} object.
 */
