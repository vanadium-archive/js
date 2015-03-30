// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Defines an invoker to invoke service methods.
 * @private
 */

module.exports = Invoker;

var createSignatures = require('../vdl/create-signatures');
var isPublicMethod = require('../lib/service-reflection').isPublicMethod;
var verror = require('../gen-vdl/v.io/v23/verror');
var capitalize = require('../vdl/util').capitalize;
var isCapitalized = require('../vdl/util').isCapitalized;
var format = require('format');
var context = require('../runtime/context');
var ArgInspector = require('../lib/arg-inspector');

// Method signatures for internal methods that are not present in actual
// signatures.
// These signatures are meant to simplify the implementation of invoke
// and may be partial.
var internalMethodSignatures = {
  __glob: {
    name: '__glob',
    outArgs: []
  },
  __globChildren: {
    name: '__globChildren',
    outArgs: []
  }
};

/**
  * Create an invoker.
  * @param {Service} service Service object.
  * @constructor
  * @private
  */
function Invoker(service) {
  if (!(this instanceof Invoker)) {
    return new Invoker(service);
  }

  var invoker = this;

  invoker._service = service;
  invoker._signature = createSignatures(service, service._serviceDescription);
  invoker._methods = {};

  // See comment in src/vdl/reflect-signature.js for..in loop
  for (var key in service) { // jshint ignore:line
    if (!isPublicMethod(key, service)) {
      continue;
    }

    if (isCapitalized(key)) {
      throw new Error('Can\'t export capitalized method ' + key);
    }

    var capitalizedMethodName = capitalize(key);
    var method = service[key];

    invoker._methods[capitalizedMethodName] = {
      name: capitalizedMethodName,
      fn: method,
      args: new ArgInspector(method)
    };
  }


  var args;
  if (typeof service.__glob === 'function') {
    args = new ArgInspector(service.__glob);
    if (args.filteredNames.length !== 1 ||
        args.names.indexOf('$stream') === -1) {
      // TODO(bjornick): Throw a verror of appropriate type.
      throw new Error(
        '__glob needs to take in a string and be streaming');
    }

    this._methods.__glob = {
      name: '__glob',
      fn: service.__glob,
      args: args
    };
  }

  if (typeof service.__globChildren === 'function') {
    args = new ArgInspector(service.__globChildren);
    if (args.filteredNames.length !== 0 ||
        args.names.indexOf('$stream') === -1 ) {
      // TODO(bjornick): Throw a verror of appropriate type.
      throw new Error(
        '__globChildren needs to take in no args and be streaming');
    }

    this._methods.__globChildren = {
      name: '__globChildren',
      fn: service.__globChildren,
      args: args
    };
  }
}

Invoker.prototype.hasGlobber = function() {
  return this.hasMethod('__glob') || this.hasMethod('__globChildren');
};

/**
 * Find a method signature corresponding to the named method.
 *
 * @param {String} methodName - The name of the method
 * @return {MethodSignature} The signature of the named method, or null.
 * @private
 */
Invoker.prototype._findMethodSignature = function(methodName) {
  for (var i = 0; i < this._signature.length; i++) {
    var sig = this._signature[i];
    if (sig.methods) {
      for (var m = 0; m < sig.methods.length; m++) {
        var method = sig.methods[m];
        if (method.name === methodName) {
          return method;
        }
      }
    }
  }
  return null;
};

/**
 * Invoker.prototype.invoke - Invoke a method
 *
 * @param  {String} name - The upper camel case name of the method to invoke.
 * @param  {Array} args - A list of arguments to call the method with, may
 * differ because of injections e.g. function x(a,$stream,b) => [0, 2].
 * @param  {Object} injections - A map of injections, should always
 * contain `context`, could also contain `stream`
 * e.g. function(ctx, x, $stream, b)
 * @param  {Invoker~invokeCallback} cb - The callback fired after completion.
 */
Invoker.prototype.invoke = function(name, args, injections, cb) {
  // TODO(jasoncampbell): Maybe throw if there are unkown injections

  var message;
  var err;

  var invoker = this;
  var service = invoker._service;
  var method = invoker._methods[name];
  var errorContext = injections.context || new context.Context();
  if (!method) {
    message = format('Method "%s"', name);
    err = new verror.NoExistError(errorContext, message);

    cb(err);
    return;
  }
  var methodSig = this._findMethodSignature(name) ||
    internalMethodSignatures[name];
  if (!methodSig) {
    cb(verror.InternalError(errorContext,
                            'Missing method signature for method ' + name));
  }

  if (!injections.context) {
    message = 'Can not call invoker.invoke(...) without a context injection';
    err = verror.InternalError(errorContext, message);
    cb(err);
    return;
  }

  var arity = method.args.arity();

  // Check argument arity against the method's declared arity
  if (args.length !== arity) {
    var template = 'Expected %d arguments but got "%s"';

    message = format(template, arity, args.join(', '));
    err = new verror.BadArgError(errorContext, message);
    cb(err);
    return;
  }

  // Clone the array so we can simply manipulate and apply later
  var clonedArgs = args.slice(0);

  // context goes in front
  clonedArgs.unshift(injections.context);

  // injectedCb converts from a call of form:
  //    injectedCb(err, a, b, c)
  // to
  //    cb(err, [a, b, c])
  //
  // The call to cb() is always has the correct number of elements
  // in the results array. If too few args are provided, the array
  // is padded with undefined values. If too many args are provided,
  // they are thrown out.
  // TODO(alexfandrianto): The promise case doesn't do this padding though.
  // Instead, it throws a verror.InternalError for the wrong # of results.
  function injectedCb(err /*, args */) {
    var res = Array.prototype.slice.call(arguments, 1,
      1 + methodSig.outArgs.length);
    var paddingNeeded = methodSig.outArgs.length - res.length;
    var paddedRes = res.concat(new Array(paddingNeeded));
    cb(err, paddedRes);
  }
  // callback at the end of the arg list
  clonedArgs.push(injectedCb);

  // splice in stream
  if (injections.stream) {
    var start = method.args.position('$stream');
    var deleteCount = 0;

    clonedArgs.splice(start, deleteCount, injections.stream);
  }

  var results;

  try {
    results = method.fn.apply(service, clonedArgs);
  } catch (e) {
    // This might be a good place to throw if there was a developer error
    // service side...
    cb(wrapError(e));
    return;
  }

  // No need to carry on if the method didn't return anythig.
  //
  // NOTE: It's possible to get falsey return values (false, empty string) so
  // always check for results === undefined.
  if (results === undefined && method.args.hasCallback()) {
    return;
  }

  // Use Promise.resolve to to handle thenable (promises) and null checking
  Promise
  .resolve(results)
  .then(function (res) {
    // We expect:
    // 0 args - return; // NOT return [];
    // 1 args - return a; // NOT return [a];
    // 2 args - return [a, b] ;
    //
    // Convert the results to always be in array style:
    // [], [a], [a, b], etc
    var resAsArray;
    switch (methodSig.outArgs.length) {
      case 0:
        resAsArray = [];
        break;
      case 1:
        resAsArray = [res];
        break;
      default:
        if (!Array.isArray(res)) {
          throw new verror.InternalError(
            errorContext,
            'Expected multiple out arguments to be returned in an array.');
        }
        resAsArray = res;
        break;
    }
    if (resAsArray.length !== methodSig.outArgs.length) {
      // -1 on outArgs.length ignores error
      // TODO(bjornick): Generate a real verror for this so it can
      // internationalized.
      throw new verror.InternalError(
        errorContext,
        'Expected', methodSig.outArgs.length, 'results, but got',
        resAsArray.length);
    }
    cb(null, resAsArray);
  })
  .catch(function error(err) {
    cb(wrapError(err));
  });
};

/**
 * This callback is fired on completion of invoker.invoke.
 * @callback Invoker~invokeCallback
 * @param {Error} err
 * @param {results} results
 */

/**
 * Return the signature of the service.
 * @return {Object} The signature
 */
Invoker.prototype.signature = function() {
  return this._signature;
};

/**
 * Wrap an error so that it is always of type Error.
 * This is used in cases where values are known to be errors even if they
 * are not of error type such as if they are thrown or rejected.
 * @private
 * @param {Error} err The error or other value.
 * @return {Error} An error or type Error.
 */
function wrapError(err) {
  if (!(err instanceof Error)) {
    return new Error(err);
  } else {
    return err;
  }
}

/**
 * returns whether the function <name> is invokable.
 * @param {string} name the name of the function
 * @return {boolean} whether the function is invokable.
 */
Invoker.prototype.hasMethod = function(name) {
  return !!this._methods[name];
};
