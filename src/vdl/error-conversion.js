// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var errorMap = require('./../runtime/error-map');
var VanadiumError = require('./../verror/vanadium-error');
var defaultLanguage = require('./../runtime/default-language');
var defaultCatalog = require('./../runtime/default-catalog');
var unwrap = require('./type-util').unwrap;
var verror = require('../gen-vdl/v.io/v23/verror');
var canonicalize = require('./canonicalize');
var registry = require('./native-type-registry');
var types = require('./types');
var defaultLanguage = require('../runtime/default-language');

module.exports = {
  fromWireValue: fromWireValue,
  fromNativeValue: fromNativeValue,
};

// VanadiumErrors already have the right type description.  We registered Error
// in case anyone tries to pass a non-vanadium error as an argument to a
// function.
registry.registerFromNativeValue(Error, fromNativeValue, types.ERROR.elem);
// We register both the optional and the concrete type for the error depending
// on what gets sent on the wire.
registry.registerFromWireValue(types.ERROR.elem, fromWireValue);

var unknown = (new verror.UnknownError(null));

/**
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
function fromWireValue(verr) {
  // We have to unwrap verr, because it could either be of type types.ERROR
  // or types.ERROR.elem The first type is an optional version of the
  // second type.
  verr = unwrap(verr);
  if (verr instanceof VanadiumError) {
    return verr.clone();
  }

  if (!verr) {
    return null;
  }
  var id = verr.id;
  var retry = verr.retryCode;
  var msg = verr.msg;
  verr.paramList = verr.paramList || [];

  var Ctor = errorMap[id] || VanadiumError;
  var err = Object.create(Ctor.prototype);
  Object.defineProperty(err, 'constructor', { value: Ctor });
  err.id = id;
  err.retryCode = retry;
  err.msg = msg;
  err.paramList = verr.paramList || [];
  // TODO(bjornick): We should plumb the context into the decoder so we can
  // get the correct langid.
  err._langId = defaultLanguage;
  Object.defineProperty(err, 'message', { value: msg });

  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(err, VanadiumError);
  } else {
    Object.defineProperty(err, 'stack', { value: (new Error()).stack });
  }

  return err;
}

/**
 * Converts from a JavaScript error object to verror standard struct which
 * wspr expects as error format.
 * @private
 * @param {Error} err JavaScript error object
 * @param {string} appName name of the app
 * @param {string} operation operation name.
 * @return {_standard} verror standard struct
 */
function fromNativeValue(err, appName, operation) {
  var paramList = [];
  if (err instanceof VanadiumError) {
    var res = err.clone();
    // We need to call fill on the paramList.  We know what
    // the expected for the defined parameters are so, we should
    // use that rather than JSValue when encoding them.
    paramList = unwrap(res.paramList);
    if (paramList.length > 0) {
      paramList[0] = canonicalize.fill(
        canonicalize.reduce(paramList[0], types.STRING),
        types.ANY);
    }
    if (paramList.length > 1) {
      paramList[1] = canonicalize.fill(
        canonicalize.reduce(paramList[1], types.STRING),
        types.ANY);
    }

    var argTypes = res._argTypes || [];
    // The first two arguments, if they exist are strings
    for (var i = 2; i < paramList.length; i++) {
      var argType = argTypes[i-2];

      // Do our best to guess the type. This avoids revealing JSValue in our
      // errors when sending native value parameters. Note: This is very hacky.
      // TODO(alexfandrianto): We need to do this because other languages will
      // print out the JSValue when they get it as an ANY. The resulting errors
      // are quite unreadable. If we guess string, number, or bool, then at
      // least they will receive something they know how to print. The cost to
      // us is that these parameters will become wrapped upon decode.
      // Issue: https://github.com/veyron/release-issues/issues/1560
      if (!argType) {
        if (typeof paramList[i] === 'string') {
          argType = types.STRING;
        } else if (typeof paramList[i] === 'boolean') {
          argType = types.BOOL;
        } else if (typeof paramList[i] === 'number') {
          argType = types.FLOAT64;
        }
      }

      // If the arg has a type, canonicalize.
      if (argType) {
        paramList[i] = canonicalize.fill(
          canonicalize.reduce(paramList[i], argType),
          types.ANY
        );
      }
    }
    return res;
  }

  if (!err) {
    return null;
  }
  var message = '';

  var errID = err.id || unknown.id;
  var errRetryCode = err.retryCode || unknown.retryCode;

  var errProps = {};
  if (err instanceof Error) {
    Object.getOwnPropertyNames(err).forEach(function(propName) {
      if (propName === 'message') {
        // Skip 'message' field since we set that ourselves to be enumerable.
        return;
      }
      errProps[propName] = Object.getOwnPropertyDescriptor(err, propName);
      // Set the property to non-enumerable.
      errProps[propName].enumerable = false;
    });

    message = err.message;

    paramList = ['app', 'call', message];
  } else if (err !== undefined && err !== null) {
    paramList = unwrap(err.paramList) || [appName, operation, err + ''];
    message = err.message || err.msg || defaultCatalog.format(
      defaultLanguage, errID, paramList);
  }

  if (!paramList[0] && appName) {
    paramList[0] = appName;
  }

  if (!paramList[1] && operation) {
    paramList[1] = operation;
  }
  // Make a copy of paramList
  var args = paramList.slice(0);
  // Add a null context to the front of the args.
  args.unshift(null);

  // Pick the correct Error Constructor. If there isn't one, use Unknown.
  var EConstructor = errorMap[errID] || verror.UnknownError;
  var e = new EConstructor(args);

  // Add properties from original error.
  Object.defineProperties(e, errProps);

  // Add verror fields.
  e.id = errID;
  e.retryCode = errRetryCode;
  e.resetArgs.apply(e, paramList);

  // Add message and msg so that they will be enumerable.
  e.message = message;
  e.msg = message;

  return e;
}
