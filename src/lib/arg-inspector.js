// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * Arguments inspector module
 * @module vanadium/src/lib/arg-inspector
 * @private
 */
module.exports = ArgumentInspector;

/**
 * ArgumentInspector - Creates a helper object for inspecting a functions
 * arguments
 *
 * @constructor
 * @param  {Function} fn The function whose arguments need to be inspected.
 * @return {ArgumentInspector} The ArgumentInspector instance.
 */
function ArgumentInspector(fn) {
  if (!(this instanceof ArgumentInspector)) {
    return new ArgumentInspector(fn);
  }

  var inspector = this;
  // Get the original array of argument names from the function.
  var names = getArgumentNamesFromFunction(fn);

  inspector.names = names;
  inspector.filteredNames = filter(names);
}

/**
 * ArgumentInspector.prototype.position - Returns the position of an
 * argument name in the original `inspector.names` list.
 *
 * @param {String} Name of the argument being tested.
 * @returns {Integer} Position of the argument name.
 */
ArgumentInspector.prototype.position = function(name) {
  return this.names.indexOf(name);
};

/**
 * ArgumentInspector.prototype.contains - Helper that returns a Boolean value
 * to check wether or not the `name` is in the `inspector.names` list of
 * original argument names.
 *
 * @param {String} Name of the argument being tested.
 */
ArgumentInspector.prototype.contains = function(name) {
  return this.position(name) >= 0;
};


/**
 * ArgumentInspector.prototype.hasContext - Helper to know if a context is in
 * the argument list and is in the right position.
 *
 * @return {Boolean} Wether or not the
 */
ArgumentInspector.prototype.hasContext = function() {
  var hasCtx = this.contains('ctx') && this.position('ctx') === 0;
  var hasContext = this.contains('context') && this.position('context') === 0;

  return hasCtx || hasContext;
};

/**
 * Helper to know if a call is in the argument position and is in the right
 * position.
 */
ArgumentInspector.prototype.hasCall = function() {
  return this.contains('serverCall') && this.position('serverCall') === 1;
};

/**
 * ArgumentInspector.prototype.hasCallback - Helper to know if a context is in
 * the argument list and is in the right position.
 *
 * @return {Boolean} Wether or not the
 */
ArgumentInspector.prototype.hasCallback = function() {
  var lastIndex = this.names.length - 1;
  var hasCb = this.contains('cb') && this.position('cb') === lastIndex;
  var hasCallback = this.contains('callback') &&
    this.position('callback') === lastIndex;

  return hasCb || hasCallback;
};

/**
 * ArgumentInspector.prototype.arity - Returns the inspected arguments airty
 * sans context and callback.
 *
 * @return {type}  description
 */
ArgumentInspector.prototype.arity = function() {
  var args = this;

  return args.filteredNames.length;
};

/**
 * Returns an array of argument names for a function.
 * from go/fypon (stack overflow) and based on angularjs's implementation
 * @param {function} func the function object
 * @return {string[]} list of the arguments
 */
function getArgumentNamesFromFunction(func) {
  var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');

  // get the arguments from the string
  var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')'))
    .match(/([^\s,]+)/g);

  if (!result) {
    result = [];
  }

  return result;
}

/**
 * filter - Returns an array of filtered argument
 * names that has been scrubbed for the first argument named context/ctx, the
 * last argument named callback/cb, and a potentially randomly injected
 * $stream argument.
 *
 * @param  {Array} names - An array of string names to filter
 * @retrun {Array} filtered array of names.
 */
function filter(names) {
  // clone the arg names
  var results = names.slice(0);
  var first = results[0];
  var last = results[results.length - 1];

  // Filter $stream wherever it lives
  var position = names.indexOf('$stream');

  if (position >= 0) {
    var deleteCount = 1;

    results.splice(position, deleteCount);
  }

  // only filter ctx/context if it is the first argument
  if (first === 'ctx' || first === 'context') {
    results.shift();
  }

  if (results[0] === 'serverCall') {
    results.shift();
  }
  // only filter cb/callback if it is the last
  if (last === 'cb' || last === 'callback') {
    results.pop();
  }

  return results;
}
