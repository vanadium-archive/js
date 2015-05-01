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
 * @param {Array} outArgs The names of the expected output arguments
 * @param {*} args The argument values
 * @param {Function} inputCb callback when finished
 * @return {type} Promise or undefined
 */
function asyncCall(ctx, self, fn, outArgs, args, inputCb) {
  var cbCalled;
  var numOutArgs = outArgs.length;
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
    var res = Array.prototype.slice.call(arguments, 1);

    if (err) {
      // Error case
      callOnceCb(err);
    } else {
      // Results case
      var numResults = res.length;
      if (numResults === numOutArgs) {
        // Correct number of out args given
        callOnceCb(null, res);
      } else {
        // Internal error: incorrect number of out args
        asyncFailedCb(makeIncorrectArgCountError(true, outArgs, numResults));
      }
    }
  }

  // Creates an error when there are an incorrect number of arguments.
  // TODO(bjornick): Generate a real verror for this so it can be
  // internationalized.
  function makeIncorrectArgCountError(isCb, expectedArgs, numGiven) {
    var delta = numGiven - expectedArgs.length;
    var prefix;
    if (isCb) {
      prefix = 'Callback of form cb(err,' + expectedArgs + ')';
    } else {
      prefix = 'Expected out args ' + expectedArgs + ' but';
    }

    var suffix;
    if (delta < 0) {
      suffix = 'was missing ' + expectedArgs.slice(numGiven);
    } else {
      suffix = 'got ' + delta + ' extra arg(s)';
    }

    return new verror.InternalError(ctx, prefix, suffix);
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
        // Note: If res is undefined, the result is [undefined].
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
    var numResults = resAsArray.length;
    if (numResults !== numOutArgs) {
      asyncFailedCb(makeIncorrectArgCountError(false, outArgs, numResults));
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
