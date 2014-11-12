/**
 * @fileoveriew A leaf dispatcher that uses a single service object for
 * all suffixes
 */

var IdlHelper = require('./../idl/idl');
var ServiceWrapper = IdlHelper.ServiceWrapper;

/**
 * Returns a dispatcher function that will reuse the same service object
 * for all suffixes
 * @param {object} object the service object that has a set of exported methods
 * @param {object} metadata the metadata is an optional parameter that adds
 * annotations to the functions exported by the functions.  This is generally
 * created by running the vdl compiler.
 * @param {Authorizer} authorizer, optional the authorizer to use.
 * @return {function} a dispatcher function that will reuse the same service
 * object.
 */
function createLeafDispatcher(serviceObject, metadata, authorizer) {
  var wrapper = new ServiceWrapper(serviceObject, metadata);
  if (metadata && metadata._validate) {
    var err = wrapper.validate(wrapper.metadata);
    if (err) {
      throw err;
    }
  }

  return function() {
    return {
      service: wrapper,
      authorizer: authorizer,
    };
  };
}

/**
 * Export module
 */
module.exports = createLeafDispatcher;
