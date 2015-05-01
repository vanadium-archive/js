// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A lightweight deferred implementation built on promises.
 *
 * A deferred encapsulates a promise and its resolve/reject methods in a single
 * object.  This makes deferreds easier to pass to around and resolve or reject
 * from other pieces of code.
 * @private
 */

var Promise = require('./promise');

module.exports = Deferred;

function Deferred(cb) {
  var deferred = this;

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  addCallback(deferred.promise, cb);
}

function addCallback(promise, cb) {
  if (cb) {
    promise.then(
      function success(value) {
        cb(null, value);
      },
      function error(err) {
        cb(err);
      }
    ).catch(function catchError(err) {
      // Re-throw the error in a process.nextTick so that it won't be caught by
      // the promise implementation.
      process.nextTick(function() {
        throw err;
      });
    });
  }
}

// This adds a callback to the deferred (for people using the callback api).
Deferred.prototype.addCallback = function(cb) {
  addCallback(this.promise, cb);
};
