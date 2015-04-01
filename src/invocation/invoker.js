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
var asyncCall = require('../lib/async-call');
var InspectableFunction = require('../lib/inspectable-function');

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

    var inspectableFn = new InspectableFunction(method);
    // Check whether the number of args reported by javascript (method.length)
    // and the number of args retrieved from fn.toString() are the same.
    // This usually differs if the method is a native method.
    if (inspectableFn.names.length !== method.length) {
      throw new Error('Function "' + key + '" can not be inspected. ' +
        'This is usually because it is a native method or bind is used.');
    }

    invoker._methods[capitalizedMethodName] = {
      name: capitalizedMethodName,
      fn: inspectableFn
    };
  }


  var fn;
  if (typeof service.__glob === 'function') {
    fn = new InspectableFunction(service.__glob);
    if (fn.filteredNames.length !== 1 ||
        fn.names.indexOf('$stream') === -1) {
      // TODO(bjornick): Throw a verror of appropriate type.
      throw new Error(
        '__glob needs to take in a string and be streaming');
    }

    this._methods.__glob = {
      name: '__glob',
      fn: fn
    };
  }

  if (typeof service.__globChildren === 'function') {
    fn = new InspectableFunction(service.__globChildren);
    if (fn.filteredNames.length !== 0 ||
        fn.names.indexOf('$stream') === -1 ) {
      // TODO(bjornick): Throw a verror of appropriate type.
      throw new Error(
        '__globChildren needs to take in no args and be streaming');
    }

    this._methods.__globChildren = {
      name: '__globChildren',
      fn: fn
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

  var arity = method.fn.arity();

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

  // splice in stream
  if (injections.stream) {
    var start = method.fn.position('$stream');
    var deleteCount = 0;

    clonedArgs.splice(start, deleteCount, injections.stream);
  }

  asyncCall(injections.context, invoker._service, method.fn,
    methodSig.outArgs.length, clonedArgs, cb);
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
 * returns whether the function <name> is invokable.
 * @param {string} name the name of the function
 * @return {boolean} whether the function is invokable.
 */
Invoker.prototype.hasMethod = function(name) {
  return !!this._methods[name];
};
