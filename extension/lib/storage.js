
var debug = require('debug')('storage');

module.exports = {
  get: get,
  set: set
};

function set(key, value, callback) {
  var object = {};
  object[key] = value;

  debug('setting', object);

  chrome.storage.sync.set(object, wrap(key, callback));
}

function get(key, callback) {
  debug('getting', key);
  chrome.storage.sync.get(key, wrap(key, callback));
}

// Wrapper for nice callbacks with errors
function wrap(key, callback) {
  return function (results){
    var res = results ? results[key] : null;
    var err = chrome.runtime.lastError;

    debug('results', key, res);

    // Process.nextTick is needed because the chrome dev tools won't properly
    // catch and display errors that are thrown in the callback to storage.get.
    process.nextTick(callback.bind(null, err, res));
  };
}
