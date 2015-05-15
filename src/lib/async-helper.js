// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


module.exports.promiseFor = promiseFor;
module.exports.promiseWhile = promiseWhile;

var Promise = require('./promise');

/**
 * promiseFor performs an asynchronous body n times.
 * @param {number} n The number of times to call body
 * @param {function} body The body to run. It should return
 * a promise that will be resolved when it is done
 * @return {Promise} A promise that will resolve when the body has
 * been run n times.
 * @private
 */
function promiseFor(n, body) {
  if (n === 0) {
    return Promise.resolve();
  }
  function doStep() {
    n--;
    if (n === 0) {
      return Promise.resolve();
    }
    return body().then(doStep);
  }

  return body().then(doStep);
}
/**
 * promiseWhile performs an asynchronous body as long as an async predict
 * is true.
 * @param {function} predicate A function that returns a Promise<bool> that
 * says whether the body should be run or not.
 * @param {function} body A function that returns a Promise that will be
 * resolved once the body is done executing.
 * @return {Promise} A promise that will be resolved once the while is done.
 * @private
 */

function promiseWhile(predicate, body) {
  return predicate().then(function(success) {
    if (!success) {
      return Promise.resolve();
    }
    return body().then(function() {
      return promiseWhile(predicate, body);
    });
  });
}
