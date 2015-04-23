// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var defaultCatalog = require('../runtime/default-catalog');
var defaultLanguage = require('../runtime/default-language');
var SharedContextKeys = require('../runtime/shared-context-keys');
var inherits = require('inherits');
var Types = require('../vdl/types');
var TypeUtil = require('../vdl/type-util');
module.exports = VanadiumError;

/**
 * @summary
 * The base error for all vanadium wire errors.  This class should not
 * be used directly, but all vanadium errors should inherit from
 * VanadiumError.
 * @constructor
 * @memberof module:vanadium.verror
 * @param {string} id The unique id for this error type.  It is preferable
 * to prefix the error name with a package path that is unique.
 * @param {module:vanadium.verror.actions} retryCode The retry action for
 * this error.
 * @param {module:vanadium.context.Context} ctx The context the error was
 * created in.
 * @param {...*} params A list of parameters to include in the error message.
 *
 * @property {string} id The unique id for this error type.
 * @property {module:vanadium.verror.actions} retryCode The retry action for
 * this error.
 * @property {Array.<*>} paramList A list of parameters to included in the error
 * message
 * this error.
 */
function VanadiumError() {
  var args = Array.prototype.slice.call(arguments);
  if (Array.isArray(args[0]) && args.length === 1) {
    args = arguments[0];
  }

  if (!(this instanceof VanadiumError)) {
    return new VanadiumError(args);
  }
  var id = args.shift();
  var retry = args.shift();
  var ctx = args.shift();
  this.paramList = args;
  this.id = id;
  this.retryCode = retry;
  if (ctx) {
    this._langId = ctx.value(SharedContextKeys.LANG_KEY) || defaultLanguage;
  } else {
    this._langId = defaultLanguage;
  }
  // The first argument is the server name.  For now well just pass in
  // app, but this should be in the context somehow.  The second parameter
  // is the operation.  This we can't get until vtrace works.
  // TODO(bjornick): Revisit after vtrace.
  args.unshift('op');
  if (ctx) {
    args.unshift(ctx.value(SharedContextKeys.COMPONENT_NAME) || 'app');
  } else {
    args.unshift('app');
  }
  this.msg = defaultCatalog.format(this._langId, id, args);

  Object.defineProperty(this,
                        'message',
                        {
                          value: this.msg,
                          writable: true
                        });

  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, VanadiumError);
  } else {
    Object.defineProperty(this, 'stack', { value: (new Error()).stack });
  }
}
inherits(VanadiumError, Error);

VanadiumError.prototype.resetArgs = function() {
  var args = Array.prototype.slice.call(arguments);
  this.paramList = args;
  this.message = defaultCatalog.format(this._langId, this.id, args);
  this.msg = this.message;
};

VanadiumError.prototype._type = Types.ERROR.elem;

/**
 * Clones the error.
 * @return {module:vanadium.verror.VanadiumError} A deep copy of the error.
 */
VanadiumError.prototype.clone = function() {
  var res = Object.create(this.constructor.prototype);
  Object.defineProperty(res, 'constructor', { value: this.constructor });
  // Make a copy of the paramList.
  if (TypeUtil.isWrapped(this.paramList)) {
    res.paramList = Object.create(this.paramList.constructor.prototype);
    Object.defineProperty(res.paramList, 'constructor', {
      value: this.paramList.constructor
    });
    res.paramList.val = TypeUtil.unwrap(this.paramList).slice(0);
  } else {
    res.paramList = this.paramList.slice(0);
  }
  res.id = this.id;
  res.retryCode = this.retryCode;
  res._langId = this._langId;
  Object.defineProperty(res, 'message', { value: this.msg });
  res.msg = this.msg;
  Object.defineProperty(res, 'stack', { value: this.stack });
  return res;
};
