/**
 * @fileoverview Declares helpers to parse information about function arguments
 * and injections.
 * @private
 */

module.exports = {
    getArgumentNamesFromFunction: getArgumentNamesFromFunction,
    getFunctionArgs: getFunctionArgs,
    getFunctionInjections: getFunctionInjections,
    getInjectionPositions: getInjectionPositions,
    getArgOffsets: getArgOffsets
};

// cache the last argument names to  avoid repeated computation.
var cachedLastFunc;
var cachedLastArgNames;

/**
 * Returns an array of argument names for a function.
 * from go/fypon (stack overflow) and based on angularjs's implementation
 * @private
 * @param {function} func the function object
 * @return {string[]} list of the arguments
 */
function getArgumentNamesFromFunction(func) {
  if (func === cachedLastFunc) {
    return cachedLastArgNames;
  }

  var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
  // get the arguments from the string
  var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).
      match(/([^\s,]+)/g);
  if (result === null) {
    result = [];
  }

  cachedLastFunc = func;
  cachedLastArgNames = result;

  return result;
}

/**
 * @private
 * @param {function} func the function object
 * @return {string[]} the arguments that don't start with $ (not injection).
 */
function getFunctionArgs(func) {
    return getArgumentNamesFromFunction(func).filter(function(arg) {
        return arg[0] !== '$';
    });
}

/**
 * @private
 * @param {function} func the function object
 * @return {int[]} the original offsets of the args (the array has
 * non-injections items)
 */
function getArgOffsets(func) {
  var allNames = getArgumentNamesFromFunction(func);
  return getFunctionArgs(func).map(function(arg) {
    return allNames.indexOf(arg);
  });
}

/**
 * @private
 * @param {function} func the function object
 * @return {string[]} the arguments that start with $ (are injections).
 */
function getFunctionInjections(func) {
    return getArgumentNamesFromFunction(func).filter(function(arg) {
        return arg[0] === '$';
    });
}

/**
 * @private
 * @return a map from injection name to position.
 */
function getInjectionPositions(func) {
    return getArgumentNamesFromFunction(func).map(function(name, index) {
      return {index: index, name: name};
    }).filter(function(arg) {
        return arg.name[0] === '$';
    }).reduce(function(currObj, currArg) {
      currObj[currArg.name] = currArg.index;
      return currObj;
    }, {});
}
