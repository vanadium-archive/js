/**
 * @fileoverview Generator of typeless service signature from javascript object.
 * @private
 */

module.exports = ReflectSignature;

var argHelper = require('../lib/arg-helper');
var ServiceReflection = require('../lib/service-reflection');
var vom = require('vom');

/**
  * Create a signature for a service by inspecting the service object.
  * @private
  * @param {Service} service The service.
  * @constructor
  */
function ReflectSignature(service) {
  if (!(this instanceof ReflectSignature)) {
    return new ReflectSignature(service);
  }

  this.methods = ServiceReflection.getExposedMethodNames(service).map(
    function(methodName) {
    var method = service[methodName];
    var methodSig = {
      name: vom.MiscUtil.capitalize(methodName)
    };

    var argNames = argHelper.getFunctionArgs(method);
    methodSig.inArgs = argNames.map(function(name) {
      return {name: name};
    }); // jshint ignore:line

    if (argHelper.getFunctionInjections(method).indexOf(
      '$stream') !== -1) {
      methodSig.streaming = true;
    }
    return methodSig;
  });
}
