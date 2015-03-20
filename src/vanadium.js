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
  logLevel: vlog.level,
  wspr: process.env.WSPR || (isBrowser ? null : 'http://localhost:8124')
};

/**
 * A module to improve cross device development.  For more details
 * see {@link https://v.io/}.
 * @module vanadium
 */
module.exports = {
  /**
   * Error namespace
   * @namespace
   */
  errors: require('./errors'),
  init: init,
  /**
   * Namespace for vanadium logger
   * @namespace
   */
  vlog: require('./lib/vlog'),

  /**
   * Namespace for naming related exports
   * @namespace
   */
  naming: require('./naming'),

  /**
   * Namespace of Vanadium security
   * @namespace
   */
  security: require('./security'),

  /**
   * Namespace for context related objects
   * @namespace
   */
  context: require('./runtime/context'),
  /**
   * Namespace for all VDL related exports
   * @namespace
   */
  vdl: require('./vdl'),

  /**
   * Namespace for vom related exports
   * @namespace
   */
  vom: require('./vom'),

  /**
   * Namespace for utilities related to creating unique ids.
   * @namespace
   */
  uniqueId: require('./lib/uniqueid'),
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
          'config.proxy when using wspr.  Use --veyron.namespace.root ' +
          'and --veyron.proxy flags to wsprd.'));
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
