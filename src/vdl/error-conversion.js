// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var errorMap = require('./../runtime/error-map');
var VanadiumError = require('./../errors/vanadium-error');
var defaultLanguage = require('./../runtime/default-language');
var defaultCatalog = require('./../runtime/default-catalog');
var unwrap = require('./type-util').unwrap;
var verror = require('../gen-vdl/v.io/v23/verror');
var canonicalize = require('./canonicalize');
var registry = require('./native-type-registry');
var Types = require('./types');
var defaultLanguage = require('../runtime/default-language');

module.exports = {
  fromWireValue: fromWireValue,
  fromNativeValue: fromNativeValue,
};

// VanadiumErrors already have the right type description.  We registered Error
// in case anyone tries to pass a non-vanadium error as an argument to a
// function.
registry.registerFromNativeValue(Error, fromNativeValue, Types.ERROR.elem);
// We register both the optional and the concrete type for the error depending
// on what gets sent on the wire.
registry.registerFromWireValue(Types.ERROR, fromWireValue);
registry.registerFromWireValue(Types.ERROR.elem, fromWireValue);

var unknown = (new verror.UnknownError(null));

/**
 * Converts from a verror standard struct which comes from wspr to JavaScript
 * Error object ensuring message and name are set properly
 * @private
 * @param {_standard} verr verror standard struct
 * @return {Error} JavaScript error object
 */
function fromWireValue(verr) {
  // We have to unwrap verr, because it could either be of type Types.ERROR
  // or Types.ERROR.elem The first type is an optional version of the
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
        canonicalize.reduce(paramList[0], Types.STRING),
        Types.ANY);
    }
    if (paramList.length > 1) {
      paramList[1] = canonicalize.fill(
        canonicalize.reduce(paramList[1], Types.STRING),
        Types.ANY);
    }

    if (res._argTypes) {
      // The first two arguments, if they exist are strings
      for (var i = 0; i < res._argTypes.length; i++) {
        if (i + 2 >= paramList.length) {
          break;
        }
        paramList[i + 2] = canonicalize.fill(
          canonicalize.fill(paramList[i + 2], res._argTypes[i]),
          Types.ANY);
      }
    }
    return res;
  }

  if (!err) {
    return null;
  }
  var message = '';

  if (err instanceof Error) {
    message = err.message;

    paramList = ['app', 'call'];
  } else if (err !== undefined && err !== null) {
    paramList = [appName, operation, err + ''];
    message = defaultCatalog.format(
      defaultLanguage, unknown.id, paramList);
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
  var e = new verror.UnknownError(args);
  e.resetArgs.apply(e, paramList);
  e.message = message;
  e.msg = message;
  return e;
}
