/**
 * @fileoveriew A leaf dispatcher that uses a single service object for
 * all suffixes
 */

var Invoker = require('./../invocation/invoker');

/**
 * Returns a dispatcher function that will reuse the same service object
 * for all suffixes
 * @param {Service} service Service object.
 * @param {Authorizer} authorizer, optional the authorizer to use.
 * @return {function} a dispatcher function that will reuse the same service
 * object.
 */
function createLeafDispatcher(service, authorizer) {
  var invoker = new Invoker(service);

  return function() {
    return {
      invoker: invoker,
      authorizer: authorizer,
    };
  };
}

/**
 * Export module
 */
module.exports = createLeafDispatcher;
