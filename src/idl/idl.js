/**
 * @fileoverview Parses the Veyron IDL
 */

'use strict';

var idlHelper = {};

// Count the number or input/output args in a string.
var countArgs = function(args) {
  args = args.trim();
  var parts = args.split(',');
  var count = parts.length;
  // Handle the cases where params is '' or the last non-whitespace character
  // in params is a ','.
  if (parts[count - 1].trim() === '') {
    count--;
  }
  return count;
};

/**
 * A representation of an function definition in the IDL.
 * @constructor
 * @param {string} method name of the method
 * @param {string} params the params string in the idl
 * @param {string} returnArgs the return arguments in the definition.
 */
var IDLFunction = function(method, params, returnArgs) {
  this.name = method;
  this.numParams = countArgs(params);
  this.numReturnArgs = countArgs(returnArgs);
};

/*
 * Regexep for method.
 */
var methodRegex = new RegExp([
    '\\s*(\\w+)',          // the method name.
    '\\(([^)]*)\\)',       // the arguments.
    '[^\\S\\n;]*',         // any non-newline whitespace.
    '(\\w+|\\([^)]*\\))?', // optional return types,
                           // both int and (int, error) forms.
    '[^\\S\\n]*',          // any non-newline whitespace.
    '({[^}]*})?',          // the optional tags.
    '[^\\S\\n]*',          // any non-newline whitespace.
    '(;|\\n)?'             // an optional final semicolon or newline.
  ].join(''), 'g');

/**
 * Parse the contents of a veyron IDL file and pulls out the services and
 * methods for each service.
 * @param {string} file the contents of the veyron IDL file
 * @return {Object} a dictionary of services to their methods, which the number
 * of arguments the method expects.
 */
idlHelper.parseIDL = function(file) {
  var strippedFile = idlHelper.stripComments(file);
  var interfaceRegex = /type\s+(\w+)\s+interface\s*{/g;

  var endOfInterfaceRegex = /\s*}/g;

  var allInterfaces = {};

  var interfaceMatch = interfaceRegex.exec(strippedFile);

  while (interfaceMatch !== null) {
    var interfaceName = interfaceMatch[1];
    var currentInterface = {};

    /*
     * We tell the endOfInterfaceRegex and methodRegex to start matching after
     * the end of the interface start.
     */
    endOfInterfaceRegex.lastIndex = interfaceRegex.lastIndex;
    methodRegex.lastIndex = interfaceRegex.lastIndex;
    var end = endOfInterfaceRegex.exec(strippedFile);
    var method = methodRegex.exec(strippedFile);

    if (end === null) {
      throw new Error('Interface ' + interfaceName + ' has no closing brace');
    }

    // 'end' could be the end of the tags section of the method, so we see if
    // the method starts first and if it does, then we ignore this end match.
    while (method !== null && method.index < end.index) {
      var name = method[1];
      var params = method[2];
      var outArgs = method[3] || '';
      currentInterface[name] = new IDLFunction(name, params, outArgs);

      // We have the endOfInterfaceRegex seek past the end of the method
      // declaration.
      endOfInterfaceRegex.lastIndex = methodRegex.lastIndex;
      end = endOfInterfaceRegex.exec(strippedFile);
      method = methodRegex.exec(strippedFile);

      if (end === null) {
        throw new Error('Interface ' + interfaceName + ' has no closing brace');
      }
    }

    allInterfaces[interfaceName] = currentInterface;
    interfaceRegex.lastIndex = endOfInterfaceRegex.lastIndex;
    interfaceMatch = interfaceRegex.exec(strippedFile);
  }
  return allInterfaces;
};

/**
 * Strips out comments.
 * @param {string} file the contents to strip the comments from
 * @return {string} the files with the comments stripped out.
 */
idlHelper.stripComments = function(file) {
  var strippedFile = '';
  var commentRegex = /\/\/.*\n|\/\*(([^*]*(\*[^\/])?)*)\*\//g;


  var match = commentRegex.exec(file);
  var pos = 0;
  while (match !== null) {
    strippedFile += file.substring(pos, match.index);
    if (match[1] === undefined || match[1].indexOf('\n') !== -1) {
      strippedFile += '\n';
    } else {
      strippedFile += ' ';
    }
    pos = match.index + match[0].length;
    match = commentRegex.exec(file);
  }

  strippedFile += file.substr(pos);
  return strippedFile;
};

/**
 * Renames a symbol to be exported (first letter is upper case).
 * @param {string} name the name to convert to be exported
 * @return {string} the input argument, but with the first letter capitalized
 */
function renameToBeExported(name) {
  return name[0].toUpperCase() + name.substring(1);
}

/**
 * Generates an IDL for a given service by iterating over the methods in the
 * service object.
 * Method names beginning with '_' are considered private and skipped.
 * Arg names beginning with '$' are not part of the idl and are filled in by
 * the veyron libraries (e.g. $context).
 * Method objects with instream fields set to true will have an input stream.
 * Method objects with outstream fields set to true will have an output stream.
 * @param {string} packageName the name of the go package the service resides in
 * @param {object} services a map of service name to service.
 * @return {string} a text representation of the idl
 */
idlHelper.generateIDL = function(packageName, services) {
  var idl = 'package ' + packageName + '\n\n';

  for (var serviceName in services) {
    if (services.hasOwnProperty(serviceName)) {
      idl += 'type ' + serviceName + ' interface {\n';
      var service = services[serviceName].metadata;
      for (var methodName in service) {
        if (service.hasOwnProperty(methodName)) {
          var metadata = service[methodName];
          idl += ' ' + renameToBeExported(methodName) + '(';

          var firstParam = true;
          var params = metadata.params;
          for (var i = 0; i < params.length; i++) {
            var param = params[i];
            if (param[0] !== '$') {
              if (!firstParam) {
                idl += ', ';
              }
              idl += param + ' anydata';
              firstParam = false;
            }
          }

          idl += ') ';

          if (metadata.injections['$stream'] !== undefined) {
            idl += 'stream<anydata, anydata> ';
          }

          idl += '(result anydata, err error)\n';
        }
      }
      idl += '}\n';
    }
  }

  return idl;
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
 */
idlHelper.ServiceWrapper = function(service) {
  this.object = service;
  this.metadata = {};

  for (var methodName in service) {
    if (service.hasOwnProperty(methodName) &&
        methodName.length > 0 && methodName[0] !== '_') {
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
        this.metadata[methodName] = {
          params: params,
          injections: injections
        };
      }
    }
  }
};

/**
 * Export the module
 */
module.exports = idlHelper;
