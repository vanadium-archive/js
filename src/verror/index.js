// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var extend = require('xtend');
var isBrowser = require('is-browser');

/**
 * @summary Namespace errors defines an error reporting mechanism that works
 * across programming environments, and a set of common errors.
 *
 * @description
 * <p>Namespace errors defines an error reporting mechanism that works
 * across programming environments, and a set of common errors.</p>
 *
 * <p>Each error has an identifier string, which is used for equality checks.
 * E.g. a Javascript client can check if a Go server returned a NoExist error by
 * checking the string identifier.  Error identifier strings start with the VDL
 * package path to ensure uniqueness, e.g. "v.io/v23/verror.NoExist".</p>
 *
 * <p>Each error contains an action, which is the suggested action for a typical
 * client to perform upon receiving the error.  E.g. some action codes represent
 * whether to retry the operation after receiving the error.</p>
 *
 * <p>Each error also contains a list of typed parameters, and an error message.
 * The error message is created by looking up a format string keyed on the error
 * identifier, and applying the parameters to the format string.  This enables
 * error messages to be generated in different languages.</p>
 *
 * @namespace
 * @name errors
 * @memberof module:vanadium
 */
module.exports = extend(require('../gen-vdl/v.io/v23/verror'), {
  makeError: require('./make-errors'),
  actions: require('./actions'),
  VanadiumError: require('./vanadium-error'),
});

if (isBrowser) {
  // Extend extension errors if browser
  module.exports = extend(
    module.exports,
    require('../browser/extension-errors')
  );
}
