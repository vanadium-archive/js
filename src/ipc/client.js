/**
 *  @fileoverview Client for the veyron service.
 *
 *  Usage:
 *  var cl = new client(proxyConnection);
 *  var service = cl.bind('EndpointAddress', 'ServiceName', {
 *    'ServiceName' : {
 *       'MethodName' : {
 *           name: 'MethodName',
 *           numParams: 1,
             numOutParams: 1
 *       }
 *     }
 *   });
 *  resultPromise = service.MethodName(arg);
 */

'use strict';

var Deferred = require('../lib/deferred');
var Promise = require('../lib/promise');
var vLog = require('../lib/vlog');

/**
 * Client for the veyron service.
 * @constructor
 * @param {Object} proxyConnection Veyron proxy client
 */
var client = function(proxyConnection) {
  this._proxyConnection = proxyConnection;
};

/**
 * Performs client side binding of a remote service to a native javascript
 * stub object.
 * @param {string} name the veyron name of the service to bind to.
 * @param {object} optServiceSignature javascript signature of methods available
 * in the remote service.
 * @return {Promise} An object with methods that perform rpcs to service methods
 */
client.prototype.bind = function(name, optServiceSignature) {
  var self = this;
  var def = new Deferred();
  var serviceSignaturePromise;

  if (optServiceSignature !== undefined) {
    serviceSignaturePromise = Promise.cast(optServiceSignature);
  } else {
    vLog.debug('Requesting service signature for:', name);
    serviceSignaturePromise = self._proxyConnection.getServiceSignature(name);
  }

  serviceSignaturePromise.then(function(serviceSignature) {
    vLog.debug('Received signature for:', name, serviceSignature);
    var boundObject = {};
    var bindMethod = function(methodName) {
      var methodInfo = serviceSignature[methodName];
      var numOutParams = methodInfo.NumOutArgs;

      boundObject[methodName] = function() {
        var args = Array.prototype.slice.call(arguments, 0);
        if (args.length !== methodInfo.InArgs.length) {
          throw new Error('Invalid number of arguments to "' +
            methodName + '". Expected ' + methodInfo.InArgs.length +
            ' but there were ' + args.length);
        }
        return self._proxyConnection.promiseInvokeMethod(
          name, methodName, args, numOutParams,
          methodInfo.IsStreaming || false);
      };
    };

    for (var methodName in serviceSignature) {
      if (serviceSignature.hasOwnProperty(methodName)) {
        bindMethod(methodName);
      }
    }

    def.resolve(boundObject);
  }).catch (def.reject);

  return def.promise;
};

/**
 * Export the module
 */
module.exports = client;
