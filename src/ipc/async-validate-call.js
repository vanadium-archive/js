// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file defines a async calling convention intended to be used by
// authorization and validation calls.
// The semantics with respect to non-thenable return values differ from
// other vanadium calling conventions. See function description for details.

var Deferred = require('../lib/deferred');

module.exports = asyncValidateCall;

/**
 * asyncValidateCall performs a call and returns the result as a thenable object
 *
 * The function the value that the called function returns can be thenable or
 * non-thenable. However, if the value is undefined the value won't be return
 * and instead the callback is expected to be invoked.
 *
 * @private
 * @return {type} Promise
 */
function asyncValidateCall() {
  var args = Array.prototype.slice.call(arguments);
  var fn = args.shift();

  var def = new Deferred();

  function cb(e) {
    var resultArgs = Array.prototype.slice.call(arguments);

    var err = resultArgs.shift();
    if (err) {
      def.reject(err);
      return;
    }

    def.resolve();
  }
  args.push(cb);

  var result;
  try {
    result = fn.apply(null, args);
  } catch (e) {
    return Promise.reject(e);
  }

  if (result === undefined) {
    // This means that we expect cb() to be called, so don't resolve/reject here
    return def.promise;
  }

  if (result === null) {
    return Promise.resolve();
  }

  if (typeof result === 'object' && result.then) {
    return result;
  }

  // Directly returned (non-thenable) values that are non-null are considered
  // errors.
  return Promise.reject(result);
}
