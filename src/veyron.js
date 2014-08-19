/**
 *  @fileoverview Public API and entry point to the Veyron API
 */

var Runtime = require('./runtime/runtime');
var Deferred = require('./lib/deferred');

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
function init(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }

  var def = new Deferred(callback);

  getIdentity(function(err, name) {
    if (err) {
      def.reject(err);
    }
    options.identityName = name;
    def.resolve(new Runtime(options));
  });

  return def.promise;
}

function getIdentity(callback) {
  var isBrowser = (typeof window === 'object');

  if (!isBrowser) {
    return process.nextTick(callback.bind(null, null));
  }

  var Postie = require('postie');
  var contentScript = new Postie(window);

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

  // Runs when the extension receives the auth request
  function handleAuthReceived(){
    // Stop asking for auth.
    window.clearInterval(authRequestInterval);
  }

  function removeListeners(){
    window.clearInterval(authRequestInterval);
    contentScript.removeListener('auth:success', handleAuthSuccess);
    contentScript.removeListener('auth:Error', handleAuthError);
  }

  contentScript.on('auth:success', handleAuthSuccess);
  contentScript.on('auth:error', handleAuthError);
  contentScript.on('auth:received', handleAuthReceived);

  // Repeatedly ask the extension to auth.  The first time this runs, the
  // extension might not be running yet, so we need to ask in a setInterval.
  // TODO(nlacasse): timeout with an error after X seconds
  var authRequestInterval = window.setInterval(function(){
    contentScript.post('auth');
  }, 200);
}
