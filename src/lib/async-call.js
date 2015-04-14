// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file defines a async calling convention intended used to call
// user-defined functions.

var verror = require('../gen-vdl/v.io/v23/verror');
var logger = require('../lib/vlog').logger;

module.exports = asyncCall;

/**
 * asyncCall performs a call and calls a callback with the result.
 *
 * The called function must either return a promise or call a callback and
 * return undefined.
 *
 * @private
 * @param {Context} ctx Context
 * @param {*} self The object to be "this" during invocation.
 * @param {InspectableFunction} fn The function
 * @param {number} numOutArgs The number of expected output arguments
 * @param {*} args The argument values
 * @param {Function} inputCb callback when finished
 * @return {type} Promise or undefined
 */
function asyncCall(ctx, self, fn, numOutArgs, args, inputCb) {
  var cbCalled;
  // Helper to call the callback once
  function callOnceCb(err, results) {
    if (cbCalled) {
      logger.error('Callback called multiple times');
      return;
    }
    inputCb.apply(this, arguments);
    cbCalled = true;
  }
  // Call the callback and log the error. Used for internal errors.
  function asyncFailedCb(err) {
    logger.error(err);
    callOnceCb(err);
  }

  // Callback we are injecting into the user's function
  function injectedCb(err /*, args */) {
    var res = Array.prototype.slice.call(arguments, 1,
      1 + numOutArgs);
    var paddingNeeded = numOutArgs - res.length;
    var paddedRes = res.concat(new Array(paddingNeeded));
    callOnceCb(err, paddedRes);
  }
  if (fn.hasCallback()) {
    args.push(injectedCb);
  }

  var result;
  try {
    result = fn.apply(self, args);
  } catch (err) {
    logger.error('Caught error: ', err);
    callOnceCb(wrapError(err));
    return;
  }

  // Callback case (wait for callback to be called directly):
  if (fn.hasCallback()) {
    return;
  }

  // Promise / direct return case:
  Promise.resolve(result).then(function(res) {
    // We expect:
    // 0 args - return; // NOT return [];
    // 1 args - return a; // NOT return [a];
    // 2 args - return [a, b] ;
    //
    // Convert the results to always be in array style:
    // [], [a], [a, b], etc
    var resAsArray;
    switch (numOutArgs) {
      case 0:
        if (res !== undefined) {
          return asyncFailedCb(new verror.InternalError(ctx,
            'Non-undefined value returned from function with 0 out args'));
        }
        resAsArray = [];
        break;
      case 1:
        resAsArray = [res];
        break;
      default:
        if (!Array.isArray(res)) {
          asyncFailedCb(new verror.InternalError(
            ctx,
            'Expected multiple out arguments to be returned in an array.'));
        }
        resAsArray = res;
        break;
    }
    if (resAsArray.length !== numOutArgs) {
      // -1 on outArgs.length ignores error
      // TODO(bjornick): Generate a real verror for this so it can
      // internationalized.
      asyncFailedCb(new verror.InternalError(
        ctx,
        'Expected', numOutArgs, 'results, but got',
        resAsArray.length));
    }
    callOnceCb(null, resAsArray);
  }).catch(function error(err) {
    callOnceCb(wrapError(err));
  });
}

/**
 * Wrap an error so that it is always of type Error.
 * This is used in cases where values are known to be errors even if they
 * are not of error type such as if they are thrown or rejected.
 * @private
 * @param {Error} err The error or other value.
 * @return {Error} An error or type Error.
 */
function wrapError(err) {
  if (!(err instanceof Error)) {
    return new Error(err);
  } else {
    return err;
  }
}
