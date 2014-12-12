/**
 * @fileoveriew A leaf dispatcher that uses a single service object for
 * all suffixes
 */

var Invoker = require('./../invocation/invoker');

/**
 * Returns a dispatcher function that will reuse the same service object
 * for all suffixes
 * @param {Service} service Service object.
 * @param {Descriptor=} desc Service descriptor, used for signature().
 * @param {Authorizer} authorizer, optional the authorizer to use.
 * @return {function} a dispatcher function that will reuse the same service
 * object.
 */
function createLeafDispatcher(service, desc, authorizer) {
  var invoker = new Invoker(service, desc);

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
