/**
 * @fileoverview Generator of typeless service signature from javascript object.
 */

module.exports = ReflectSignature;

var argHelper = require('../lib/arg_helper');
var vom = require('vom');

/**
  * Create a signature for a service by inspecting the service object.
  * @param {Service} service The service.
  * @constructor
  */
function ReflectSignature(service) {
    if (!(this instanceof ReflectSignature)) {
        return new ReflectSignature(service);
    }

    this.methods = [];
    for (var methodName in service) {
        // We don't use hasOwnProperty because we want to support defining
        // methods in the prototype chain.
        if (typeof service[methodName] === 'function') {
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

            this.methods.push(methodSig);
        }
    }
}