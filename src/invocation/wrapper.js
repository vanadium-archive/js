/**
 * @fileoverview Wraps services in a format needed internally for invocation.
 *
 * This effectly converts between two calling styles of services.
 *
 * The unwrapped services have the needed injections and args in a sequential
 * list.
 * e.g. function(a, b, $c, d)
 *
 * The wrapped service split args and injections:
 * e.g. function(wireArgArray, possibleInjects)
 * where wireArgArray is a list of args as sent over the wire (i.e. those not
 * including injections).
 * possibleInjects is a map from injection name to value. This may include
 * injections that the function doesn't actually use.
 *
 * Wrapped services also define a signature function if one does not exist
 * on the underlying service.
 */

module.exports = wrapService;

var argHelper = require('../lib/arg_helper');
var Signature = require('../vdl/signature');
var vError = require('../lib/verror');
var vlog = require('../lib/vlog');

/**
  * @param {Service} service Unwrapped service
  * @param {Descriptor=} desc Service descriptor, used for signature().
  * See signature.js for more details.
  * @return {WrappedService} wrappedService Wrapped service
  */
function wrapService(service, desc) {
    var wrappedService = {};
    for (var methodName in service) {
        if (typeof service[methodName] === 'function') {
            var method = service[methodName];
            var injectionPositions = argHelper.getInjectionPositions(method);
            var argOffsets = argHelper.getArgOffsets(method);
            wrappedService[methodName] = invoke.bind(null, service,
              method, argOffsets, injectionPositions);
        }
    }
    if (!wrappedService.hasOwnProperty('signature')) {
        wrappedService.signature = function() {
          return new Signature(service, desc);
        };
    }
    return wrappedService;
}

/**
  * Translates args to the native list-of-injections-and-non-injections style.
  * @param {int[]} argOffsets List of original indicies of args. See
  * getArgOffsets().
  * @param {map[string]int} injectionPositions Map from injection name to
  * position.
  * @param {Object[]} args List of args coming off of the wire.
  * @param {map[string]Object} Object containing possible injection values.
  * @return {string[]} A list of combined injections and args off the wire.
  */
function translateToTrueCallArgs(argOffsets, injectionPositions, args,
  potentialInjections) {
    var callArgs = new Array(argOffsets.length +
      Object.keys(injectionPositions).length);
    for (var i = 0; i < args.length; i++) {
        callArgs[argOffsets[i]] = args[i];
    }
    for (var injection in injectionPositions) {
        if (injectionPositions.hasOwnProperty(injection)) {
          if (!potentialInjections.hasOwnProperty(injection)) {
            vlog.warn('Function received unknown injection ' + injection);
          }
          callArgs[injectionPositions[injection]] =
            potentialInjections[injection];
        }
    }
    return callArgs;
}

/**
  * Invoke a service method.
  * @param {Service} service The service object to invoke a method on.
  * @param {Function} method The method to invoke
  * @param {int[]} argOffsets List of original indicies of args. See
  * getArgOffsets().
  * @param {map[string]int} injectionPositions Map from injection name to
  * position.
  * @param {Object[]} args List of args coming off of the wire.
  * @param {map[string]Object} Object containing possible injection values.
  * @return {string[]} A list of combined injections and args off the wire.
  */
function invoke(
  service, method, argOffsets, injectionPositions, // Bound by wrapService().
  args, potentialInjections // Passed on invocation.
  ) {
    if (args.length !== argOffsets.length) {
        throw new vError.BadArgError('Expected ' + argOffsets + ' args, got ' +
          args);
    }
    var callArgs = translateToTrueCallArgs(argOffsets, injectionPositions,
      args, potentialInjections);

    return method.apply(service, callArgs);
}
