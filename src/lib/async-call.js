// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file defines a async calling convention intended used to call
// user-defined functions.

var logger = require('../lib/vlog').logger;
var makeError = require('../verror/make-errors');
var actions = require('../verror/actions');

module.exports = asyncCall;

var IncorrectResultCountError = makeError(
  'v.io/core/javascript.IncorrectResultCount',
  actions.NO_RETRY,
  '{1:}{2:} IncorrectResultCount: Expected {3} results, but got {4}{:_}');
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
    inputCb.apply(self, arguments);
    cbCalled = true;
  }
  function handleResult(err, res) {
    if (err) {
      // Error case
      return callOnceCb(err);
    }
    // Results case
    var numResults = res.length;
    if (numResults === numOutArgs) {
      // Correct number of out args given
      return callOnceCb(null, res);
    }
    // Internal error: incorrect number of out args
    err = new IncorrectResultCountError(ctx, numOutArgs, numResults);
    logger.error(err);
    callOnceCb(err);
  }
  // Callback we are injecting into the user's function
  function injectedCb(err /*, args */) {
    handleResult(err, Array.prototype.slice.call(arguments, 1));
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
    // Note that the arity checking isn't done here, but at a later point
    // sharing the logic between the callback and promise case.
    switch (numOutArgs) {
      case 0:
        if (res !== undefined) {
          return Promise.reject(
            new IncorrectResultCountError(ctx, 0, 1,
                                          'expected undefined result ' +
                                          'for void function'));
        }
        return [];
      case 1:
        // Note: If res is undefined, the result is [undefined].
        return [res];
      default:
        if (!Array.isArray(res)) {
          return Promise.reject(
            new IncorrectResultCountError(ctx, numOutArgs, 1));
        }
        return res;
    }
  }).then(function(res) {
    handleResult(null, res);
  }).catch(function(err) {
    handleResult(wrapError(err));
  });
}

/**
 * Wrap an error so that it is always of type Error.
 * This is used in cases where values are known to be errors even if they
 * are not of error type such as if they are thrown or rejected.
 * @private
 * @param {*} err The error or other value.
 * @return {Error} An error or type Error.
 */
function wrapError(err) {
  if (err instanceof Error) {
    return err;
  }
  return new Error(err);
}
