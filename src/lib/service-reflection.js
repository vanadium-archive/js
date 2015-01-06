/**
 * @fileoverview Helpers for performing reflection on user-defined services
 * in a consistent way.
 * @private
 */

module.exports = {
  getExposedMethodNames: getExposedMethodNames
};

/**
 * Gets the names of methods on the provided service that are not marked
 * as private (with '_'). This descends the prototype chain.
 * @private
 * @param {Service} serviceObject The service
 * @return A list of names of the object that are exposed.
 */
function getExposedMethodNames(serviceObject) {
  var methodNames = [];
  for (var key in serviceObject) { // jshint ignore:line
    // NOTE: We are iterating over the entire prototype chain.
    if (key.length === 0 || key[0] === '_') {
      // Private.
      continue;
    }
    if (typeof serviceObject[key] !== 'function') {
      // Not function.
      continue;
    }
    methodNames.push(key);
  }
  return methodNames;
}