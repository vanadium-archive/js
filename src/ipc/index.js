// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary
 * Namespace rpc defines the public interface for all
 * interprocess communication.
 * @description
 * <p>Namespace rpc defines the public interface for all
 * interprocess communication.</p>
 *
 * <p>There are two actors in the system,
 * [clients]{@link module:vanadium.rpc~Client} and
 * [servers]{@link module:vanadium.rpc~Server}. Clients invoke
 * methods on Servers, using the bindTo method provided by the Client
 * interface. Servers implement methods on named objects. The named object is
 * found using a [Dispatcher]{@link Dispatcher}, and the method is invoked using
 * an Invoker.</p>
 * <p>Instances of the [Runtime]{@link module:vanadium~Runtime} host
 * Clients and Servers, such instances may
 * simultaneously host both Clients and Servers. The Runtime allows multiple
 * names to be simultaneously supported via the Dispatcher interface.</p>
 *
 * <p>The [naming]{@link module:vanadium.naming} namespace provides a
 * rendezvous mechanism for
 * Clients and Servers. In particular, it allows Runtimes hosting Servers to
 * share Endpoints with Clients that enables communication between them.
 * Endpoints encode sufficient addressing information to enable
 * communication.</p>
 * @memberof module:vanadium
 * @namespace rpc
 */

module.exports = {
  /**
   * Namespace reserved defines interfaces for interacting with reserved RPC
   * methods such as Signature, MethodSignature and Glob.
   * @memberof module:vanadium.rpc
   * @namespace reserved
   */
  reserved: require('../gen-vdl/v.io/v23/rpc/reserved')
};