// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 *  @fileoverview Public Vanadium API.
 *  @private
 */

var extend = require('xtend');
var isBrowser = require('is-browser');
var SharedContextKeys = require('./runtime/shared-context-keys');

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
 * A module to improve cross device development. For more details
 * see {@link https://v.io/}.
 * @module vanadium
 */
module.exports = {
  init: init,
  errors: require('./errors'),
  /**
   * Namespace for rpc related exports
   * @namespace
   */
  rpc: require('./ipc'),

  vlog: require('./lib/vlog'),

  naming: require('./naming'),

  /**
   * Namespace of Vanadium security.
   * @namespace
   */
  security: require('./security'),

  /**
   * Namespace for context related objects.
   * @namespace
   */
  context: require('./runtime/context'),
  vdl: require('./vdl'),

  /**
   * Namespace for vom related exports.
   * @namespace
   */
  vom: require('./vom'),

  /**
   * Namespace for utilities related to creating unique ids.
   * @namespace
   */
  uniqueId: require('./lib/uniqueid'),

  /**
   * Namespace for vtrace related functions and types.
   * @namespace
   */
  vtrace: require('./vtrace'),

  runtimeForContext: runtimeForContext,
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
 * Gets the {@link Runtime} for a given [Context]
 * {@link module:vanadium.context.Context}
 * @param {module:vanadium.context.Context} ctx The context
 * @return {Runtime} the runtime for the context
 */
function runtimeForContext(ctx) {
  return ctx.value(SharedContextKeys.RUNTIME);
}
/**
 * Creates a Vanadium [runtime]{@link Runtime}.
 * @param {Object} config Configuration options
 * @param {function} [cb] If provided, the callback that will be called with an
 * error or the new runtime
 * @return {Promise.<Runtime>} A promise that resolves to the new Runtime
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
