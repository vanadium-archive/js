/**
 *  @fileoverview Public API and entry point to the Veyron API
 */

var Runtime = require('./runtime/runtime');
var Deferred = require('./lib/deferred');
var vlog = require('./lib/vlog');
var extend = require('xtend');
var isBrowser = require('is-browser');

var defaults = {
  logLevel: vlog.level,
  authenticate: false,
  authTimeout: 5000, // ms
};

/**
 * Exports
 */
module.exports = {
  init: init,
  logLevels: require('./lib/vlog').levels,
  namespaceUtil: require('./namespace/util'),
  errors: require('./lib/verror')
};

/**
 * Create a Veyron Runtime
 * @param {Object} config Configuration Options
 */
function init(config, callback) {
  if (typeof config === 'function') {
    callback = config;
    config = {};
  }

  config = extend(defaults, config);

  var def = new Deferred(callback);

  var runtimeOpts = {
    wspr: config.wspr || process.env['WSPR'] || 'http://localhost:8124'
  };

  // If we are running in a browser, and the user has not set
  // config.skipAuthentication to true, then we will get an authenticated
  // (blessed-by-identity-server) identity for the user.  This requires the
  // Veyron Chrome Extension to be installed and enabled, and WSPR must be
  // configured to talk to Veyron identity server, e.g. the one currently hosted
  // at: /proxy.envyor.com:8101/identity/veyron-test/google The resulting
  // runtime will have runtime.identityName set to the name of the authenticated
  // identity.
  //
  // If we are not in a browser, or if the user has set
  // config.authenticate to true, then create a runtime with the
  // identityName 'unknown'.
  if (isBrowser && config.authenticate) {
    getIdentity(config.authTimeout, function(err, name) {
      if (err) {
        def.reject(err);
        return def.promise;
      }
      runtimeOpts.identityName = name;
      def.resolve(new Runtime(runtimeOpts));
    });
  } else {
    runtimeOpts.identityName = 'unknown';
    def.resolve(new Runtime(runtimeOpts));
  }

  return def.promise;
}

// getIdentity tells the Veyron Extension to start an OAuth flow, get an access
// token for the user, and exchange that access token for a blessed identity in
// WSPR, which is then associated with the origin of the web app.
//
// The flow starts by repeatedly sending an 'auth' message to the Veyron
// Extension content script.  It must perform this repeatedly because the first
// messages might get sent before the content script has had time to start.
//
// When the content script eventually receives the 'auth' message, it responds
// with an 'auth:received' message to let us know we can stop requesting auth.
//
// If no 'auth:received' message is received within config.authTimeout
// milliseconds, we timeout with an error.
//
// Once the extension has received the 'auth' message, it will perform the OAuth
// <-> WSPR identity flow, and respond with either an 'auth:success' message or
// an 'auth:error' message.
function getIdentity(authTimeoutMs, callback) {
  var Postie = require('postie');
  var contentScript = new Postie(window);

  function clearTimingEvents() {
    // Stop asking for auth.
    window.clearInterval(authRequestInterval);
    // Cancel timeout timer.
    window.clearTimeout(timeout);
  }

  // Runs when the auth request succeeds.
  function handleAuthSuccess(data) {
    removeListeners();
    callback(null, data.name);
  }

  // Runs when the auth request fails.
  function handleAuthError(err) {
    removeListeners();
    callback(err);
  }

  // Runs when the extension receives the auth request.
  function handleAuthReceived() {
    clearTimingEvents();
  }

  // Runs when timeout occurs before getting 'auth:received' message.
  function handleTimeout() {
    handleAuthError(new Error(
        'Auth timeout. Please ensure that the Veyron Chrome Extension is ' +
        'installed and enabled. Download it here: ' +
        'https://github.com/veyron/veyron.js/raw/master/extension/veyron.crx'
    ));
  }

  function removeListeners() {
    clearTimingEvents();
    contentScript.removeListener('auth:success', handleAuthSuccess);
    contentScript.removeListener('auth:error', handleAuthError);
  }

  contentScript.on('auth:success', handleAuthSuccess);
  contentScript.on('auth:error', handleAuthError);
  contentScript.on('auth:received', handleAuthReceived);

  // Repeatedly ask the extension to auth.  The first time this runs, the
  // extension might not be running yet, so we need to ask in a setInterval.
  var authRequestInterval = window.setInterval(function(){
    contentScript.post('auth');
  }, 200);

  // Timeout if we don't get an 'auth:received' message before authTimeoutMs
  // milliseconds.
  var timeout = setTimeout(handleTimeout, authTimeoutMs);
}
