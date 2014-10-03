/**
 * @fileoverview Parses the Veyron IDL
 */

var vError = require('../lib/verror');
var idlHelper = {};

/**
 * Generates an IDL wire description for a given service by iterating over the
 * methods in the service object.
 * Method names beginning with '_' are considered private and skipped.
 * Arg names beginning with '$' are not part of the idl and are filled in by
 * the veyron libraries (e.g. $context).
 * @param {object} service a description of the service. This is a map from
 * method name to method description.
 * @return {object} a representation of the idl. This must match the format of
 * JSONServiceSignature in Veyron's go code.
 */
idlHelper.generateIdlWireDescription = function(service) {
  var idlWire = {};
  var metadata = service.metadata;
  for (var methodName in metadata) {
    if (metadata.hasOwnProperty(methodName)) {
      var methodMetadata = metadata[methodName];

      var params = methodMetadata.params;
      var inArgs = [];
      for (var i = 0; i < params.length; i++) {
        var param = params[i];
        if (param[0] !== '$') {
          inArgs.push(param);
        }
      }

      idlWire[methodName] = {
        InArgs: inArgs,
        NumOutArgs: methodMetadata.numOutArgs + 1,
        IsStreaming: methodMetadata.injections['$stream'] !== undefined
      };
    }
  }

  return idlWire;
};

/**
 * Returns an array of parameter names for a function.
 * from go/fypon (stack overflow) and based on angularjs's implementation
 * @param {function} func the function object
 * @return {string[]} list of the parameters
 */
var getParamNames = function(func) {
  // represent the function as a string and strip comments
  var fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
  // get the arguments from the string
  var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).
      match(/([^\s,]+)/g);
  if (result === null) {
    result = [];
  }
  return result;
};

/**
 * Wraps a Service with annotations for each exported function.
 * @constructor
 * @param {object} service the service that is being exported.
 * @param {object} extraMetadata if provided, adds extra metadata for
 * the functions exported (such as number of return values).
 */
idlHelper.ServiceWrapper = function(service, extraMetadata) {
  this.object = service;
  this.metadata = {};
  extraMetadata = extraMetadata || {};

  for (var methodName in service) {
    if (methodName.length > 0 && methodName[0] !== '_') {
      if (methodName[0] >= 'A' && methodName[0] <= 'Z') {
        var camelCaseName = methodName.charAt(0).toLowerCase() +
          methodName.slice(1);
        throw new Error('Method names must be camel case. Perhaps rename \'' +
          methodName + '\' to \'' + camelCaseName + '\'');
      }
      var method = service[methodName];
      if (typeof method === 'function') {
        var params = getParamNames(method);
        var injections = {};
        for (var i = 0; i < params.length; i++) {
          var name = params[i];
          if (name[0] === '$') {
            injections[name] = i;
          }
        }
        var metadata = {
          params: params,
          injections: injections,
          numOutArgs: 1
        };

        // We only want to copy over the accepted metadata options.
        if (extraMetadata[methodName]) {
          var extra = extraMetadata[methodName];
          if (extra.numOutArgs !== undefined) {
            metadata.numOutArgs = extra.numOutArgs;
          }

          metadata.label = extra.label;
        }

        this.metadata[methodName] = metadata;
      }
    }
  }
};

idlHelper.ServiceWrapper.prototype.validate = function(definition) {
  for (var name in definition) {
    if (definition.hasOwnProperty(name)) {
      var metadata = this.metadata[name];
      if (!metadata) {
        return new vError.BadArgError('Missing method: ' + name);
      }
      var expected = definition[name];
      var inputArgs = metadata.params.length -
          Object.keys(metadata.injections).length;
      if (inputArgs !== expected.numInArgs) {
        return new vError.BadArgError('Wrong number of input args for ' +
            name + ', got: ' + inputArgs + ', expected: ' +
            expected.numInArgs);
      }

      if (metadata.numOutArgs !== expected.numOutArgs) {
        return new vError.BadArgError('Wrong number of output args for ' +
            name + ', got: ' + metadata.numOutArgs + ', expected ' +
            expected.numOutArgs);
      }

      var hasStreaming = metadata.injections.hasOwnProperty('$stream');
      var expectingStreaming = (expected.inputStreaming ||
          expected.outputStreaming);
      if (expectingStreaming && !hasStreaming) {
        return new vError.BadArgError('Expected ' + name + ' to be ' +
              'streaming');
      } else if (!expectingStreaming && hasStreaming) {
        return new vError.BadArgError('Expected ' + name + ' to not be ' +
              'streaming');

      }
    }
  }

  for (name in this.metadata) {
    if (this.metadata.hasOwnProperty(name) &&
        !definition.hasOwnProperty(name)) {
      return new vError.BadArgError('Unexpected method ' + name +
          ' implemented.');
    }
  }
  return null;
};

idlHelper.ServiceWrapper.prototype.labelForMethod = function(method) {
  if (!this.metadata.hasOwnProperty(method)) {
    return 0;
  }
  return this.metadata[method].label || 0;
};

/**
 * Export the module
 */
module.exports = idlHelper;
