// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var debug = require('debug')('storage');

module.exports = {
  get: get,
  set: set
};

function set(key, value, callback) {
  var jsonValue = JSON.stringify(value);
  var object = {};
  object[key] = jsonValue;

  debug('setting', object);

  chrome.storage.sync.set(object, wrap(key, callback));
}

function get(key, callback) {
  debug('getting', key);
  chrome.storage.sync.get(key, wrap(key, function(err, jsonValue) {
    if (err) {
      return callback(err);
    }

    if (jsonValue === null || jsonValue === undefined) {
      return callback(null, null);
    }

    try {
      return callback(null, JSON.parse(jsonValue));
    } catch (err) {
      return callback(new Error('Could not parse value from storage: ' +
        jsonValue));
    }
  }));
}

// Wrapper for nice callbacks with errors
function wrap(key, callback) {
  return function(results) {
    var res = results ? results[key] : null;
    var err = chrome.runtime.lastError;

    debug('results', key, res);

    // Process.nextTick is needed because the chrome dev tools won't properly
    // catch and display errors that are thrown in the callback to storage.get.
    process.nextTick(callback.bind(null, err, res));
  };
}
