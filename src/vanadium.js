// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 *  @fileoverview Public Vanadium API.
 *  @private
 */

var extend = require('xtend');
var isBrowser = require('is-browser');

var Deferred = require('./lib/deferred');
var runtime = require('./runtime');
var vlog = require('./lib/vlog');

var defaults = {
  appName: 'untitled webapp',
  authenticate: isBrowser,
  logLevel: vlog.levels.WARN,
  wspr: process.env.WSPR || (isBrowser ? null : 'http://localhost:8124')
};

/**
 * <p>Module vanadium defines the [Runtime]{@link module:vanadium~Runtime}
 * interface of the public Vanadium API
 * and its sub namespaces define the entire Vanadium public API.
 * It also defines the [init]{@link module:vanadium.init}
 * method which is used to initialize a
 * [runtime]{@link module:vanadium~Runtime} instance.</p>
 * <p>Once we reach a '1.0' version these public APIs will be stable over
 * an extended period and changes to them will be carefully managed to ensure
 * backward compatibility.</p>
 * <p>The current release is '0.1' and although we will do our best to maintain
 * backwards compatibility we can't guarantee that until we reach the '1.0'
 * milestone.
 * For more details about the Vanadium project,
 * please visit {@link https://v.io}.</p>
 * @module vanadium
*/

module.exports = {
  init: init,
  verror: require('./verror'),
  rpc: require('./rpc'),
  vlog: require('./lib/vlog'),
  naming: require('./naming'),
  security: require('./security'),
  context: require('./runtime/context'),
  vdl: require('./vdl'),
  vom: require('./vom'),
  uniqueId: require('./lib/uniqueid'),
  vtrace: require('./vtrace'),
  runtimeForContext: require('./runtime/runtime-from-context'),
};

if (isBrowser) {
  /**
   * Namespace for Chrome extension related exports.
   * This is only available in browser environment and will not exist in NodeJS.
   * @namespace
   */
  module.exports.extension = require('./browser/extension-utils');
}
/**
 * Callback passed into the {@link module:vanadium.init} that will be
 * called when the initialization has finished.
 * @callback init~cb
 * @param {Error?} err If set, the error that occurred during
 * {@link module:vanadium.init}
 * @param {module:vandium~Runtime} rt The runtime that was constructed.
 */
/**
 * Creates a Vanadium [runtime]{@link module:vanadium~Runtime}.
 * @param {Object} config Configuration options
 * @param {init~cb} [cb] If provided, the callback that will be called with an
 * error or the new runtime
 * @return {Promise.<module:vanadium~Runtime>} A promise that resolves to the
 * new Runtime.
 * @memberof module:vanadium
 */
function init(config, cb) {
  if (typeof config === 'function') {
    cb = config;
    config = {};
  }

  config = extend(defaults, config);

  if (config.logLevel) {
    vlog.logger.level = config.logLevel;
  }

  var runtimeOpts = {
    appName: config.appName,
    namespaceRoots: config.namespaceRoots,
    proxy: config.proxy,
    wspr: config.wspr
  };

  var def = new Deferred(cb);

  // Validate config settings.
  if (isBrowser && config.wspr) {
    return def.reject(new Error('config.wspr requires NodeJS environment.'));
  }
  if (!isBrowser && !config.wspr) {
    return def.reject(new Error('config.wspr is required in NodeJS ' +
          'environment.'));
  }
  if (!isBrowser && config.authenticate) {
    return def.reject(new Error('config.authenticate requires browser ' +
          'environment'));
  }
  if (config.wspr && (config.namespaceRoots || config.proxy)) {
    return def.reject(new Error('Cannot set config.namespaceRoots or ' +
          'config.proxy when using wspr.  Use --v23.namespace.root ' +
          'and --v23.proxy flags to wsprd.'));
  }

  // If the user has set config.authenticate to true, get an authenticated
  // (blessed-by-Blessing-server) account for the user.  This requires the
  // Vanadium Chrome Extension to be installed and enabled.  The resulting
  // runtime will have runtime.accountName set of authenticated account.
  //
  // Otherwise, create a runtime with accountName 'unknown'.
  if (config.authenticate) {
    getAccount(function(err, accountName) {
      if (err) {
        return def.reject(err);
      }
      runtimeOpts.accountName = accountName;
      runtime.init(runtimeOpts, onRtInit);
    });
  } else {
    runtimeOpts.accountName = 'unknown';
    runtime.init(runtimeOpts, onRtInit);
  }

  function onRtInit(err, rt) {
    if (err) {
      return def.reject(err);
    }
    def.resolve(rt);
  }

  return def.promise;
}

// getAccounts tells the Vanadium Extension to start an OAuth flow, gets an
// access token for the user, and exchanges that access token for an account
// which is then associated with the origin of the web app.
//
// Once the extension has received the 'auth' message, it will perform the OAuth
// <-> WSPR identity flow, and respond with either an 'auth:success' message or
// an 'auth:error' message.
function getAccount(cb) {
  var extensionEventProxy = require('./browser/event-proxy');

  extensionEventProxy.sendRpc('auth', null, function(err, data) {
    if (err) {
      return cb(err);
    }
    return cb(null, data.account);
  });
}
