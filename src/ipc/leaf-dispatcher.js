/**
 * @fileoveriew A leaf dispatcher that uses a single service object for
 * all suffixes
 */

/**
 * Returns a dispatcher function that will reuse the same service object
 * for all suffixes
 * @private
 * @param {Service} service Service object.
 * @param {Authorizer} authorizer, optional the authorizer to use.
 * @return {function} a dispatcher function that will reuse the same service
 * object.
 */
function createLeafDispatcher(service, authorizer) {
  return function() {
    return {
      service: service,
      authorizer: authorizer,
    };
  };
}

/**
 * Export module
 */
module.exports = createLeafDispatcher;
