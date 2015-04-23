// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var errorMap = require('../runtime/error-map');
var inherits = require('inherits');
var defaultCatalog = require('../runtime/default-catalog');
var VanadiumError = require('./vanadium-error');

module.exports = makeError;

/**
 * Returns a constructor that represents the error id
 * and retryCode passed in.
 * @param {string} id The unique id for this error type.  It is preferable
 * to prefix the error name with a package path that is unique.
 * @param {module:vanadium.verror.actions} retryCode The retry action for this
 * error.
 * @param {string|object} format If a string, then it's the en-US text string,
 * otherwise it is a map from languageId to format string.
 * @param {Array} types The array of types that expected for the arguments to
 * the error constructor.
 * @returns {function} A constructor function
 * that can be used to create vanadium errors with the given error id.
 * The returned constructor function inherits from
 * {@link module:vanadium.verror.VanadiumError}.
 * @memberof module:vanadium.verror
 */
function makeError(id, retryCode, format, types) {
  var fname = id.split('.').pop();
  var Errors = {};
  Errors[fname] = function() {
    var args = Array.prototype.slice.call(arguments);
    if (Array.isArray(args[0]) && args.length === 1) {
      args = args[0];
    }
    if (!(this instanceof Errors[fname])) {
      return new Errors[fname](args);
    }
    args.unshift(retryCode);
    args.unshift(id);
    VanadiumError.apply(this, args);
  };
  inherits(Errors[fname], VanadiumError);
  Errors[fname].prototype._argTypes = types || [];
  errorMap[id] = Errors[fname];
  if (typeof format === 'string') {
    format = {
      'en-US': format
    };
  }

  if (format) {
    var keys = Object.keys(format);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      defaultCatalog.setWithBase(key, id, format[key]);
    }
  }
  return Errors[fname];
}