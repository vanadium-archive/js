/**
 *  @fileoverview Public Veyron API.
 *  @private
 */

var extend = require('xtend');
var isBrowser = require('is-browser');

var Deferred = require('./lib/deferred');
var Runtime = require('./runtime/runtime');
var vlog = require('./lib/vlog');

var defaults = {
  appName: 'webapp',
  authenticate: isBrowser,
  logLevel: vlog.level,
  wspr: process.env.WSPR || (isBrowser ? null : 'http://localhost:8124')
};

/**
 * Exports
 */
module.exports = {
  errors: require('./errors/verror'),
  makeError:  require('./errors/make-errors'),
  errorActions: require('./errors/actions'),
  init: init,
  logLevels: require('./lib/vlog').levels,
  namespaceUtil: require('./namespace/util'),
  Promise: require('./lib/promise'),
  aclAuthorizer: require('./security/acl-authorizer'),
  context: require('./runtime/context'),
  vom: require('./vom/vom'),
};

/**
 * Creates a Veyron runtime.
 * @param {Object} config Configuration options
 */
function init(config, cb) {
  if (typeof config === 'function') {
    cb = config;
    config = {};
  }

  config = extend(defaults, config);

  var runtimeOpts = {
    appName: config.appName,
    wspr: config.wspr
  };

  if (config.logLevel) {
    vlog.level = config.logLevel;
  }

  var def = new Deferred(cb);

  // If the user has set config.authenticate to true, get an authenticated
  // (blessed-by-Blessing-server) account for the user.  This requires the
  // Veyron Chrome Extension to be installed and enabled.  The resulting runtime
  // will have runtime.accountName set of authenticated account.
  //
  // Otherwise, create a runtime with accountName 'unknown'.
  if (config.authenticate) {
    getAccount(function(err, account) {
      if (err) {
        def.reject(err);
        return def.promise;
      }
      runtimeOpts.accountName = account;
      def.resolve(new Runtime(runtimeOpts));
    });
  } else {
    runtimeOpts.accountName = 'unknown';
    def.resolve(new Runtime(runtimeOpts));
  }

  return def.promise;
}

// getAccounts tells the Veyron Extension to start an OAuth flow, gets an
// access token for the user, and exchanges that access token for an account
// which is then associated with the origin of the web app.
//
// Once the extension has received the 'auth' message, it will perform the OAuth
// <-> WSPR identity flow, and respond with either an 'auth:success' message or
// an 'auth:error' message.
function getAccount(cb) {
  if (!isBrowser) {
    return cb(new Error('authenticate=true requires browser environment'));
  }

  var extensionEventProxy = require('./proxy/event-proxy');

  function onAuthSuccess(data) {
    removeListeners();
    cb(null, data.account);
  }

  // Handle auth-specific errors.
  function onAuthError(data) {
    removeListeners();
    cb(objectToError(data.error));
  }

  // Handle generic error event, which can be triggered if the extension is not
  // running.
  function onError(err) {
    removeListeners();
    cb(err);
  }

  function removeListeners() {
    extensionEventProxy.removeListener('auth:success', onAuthSuccess);
    extensionEventProxy.removeListener('auth:error', onAuthError);
    extensionEventProxy.removeListener('error', onAuthError);
  }

  extensionEventProxy.on('auth:success', onAuthSuccess);
  extensionEventProxy.on('auth:error', onAuthError);
  extensionEventProxy.on('error', onError);

  // Send auth request.
  extensionEventProxy.send('auth');
}

// An error that gets sent via postMessage will be received as a plain Object.
// This function turns it back into an Error object.
function objectToError(obj) {
  var err = new Error(obj.message);
  err.name = obj.name;
  err.stack = obj.stack;
  return err;
}
