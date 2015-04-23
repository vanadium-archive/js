// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var inherits = require('inherits');

var consts = require('./extension-consts');

module.exports = {
  ExtensionCrashError: ExtensionCrashError,
  ExtensionNotInstalledError: ExtensionNotInstalledError,
};

/**
 * @summary
 * ExtensionCrashError indicates that the Vanadium extension has crashed.
 * This is only available in browser environment and will not exist in NodeJS.
 * @name ExtensionCrashError
 * @constructor
 * @memberof module:vanadium.verror
 * @extends Error
 */
function ExtensionCrashError(message) {
  this.name = 'ExtensionCrashError';
  this.message = message || [
    'The Vanadium extension has crashed.  It is necessary to reload this page ',
    'for Vanadium to continue to to fully function.'
  ].join('');
}
inherits(ExtensionCrashError, Error);

/**
 * @summary
 * ExtensionNotInstalledError indicates that the Vanadium extension is not
 * installed.
 * @description
 * This is only available in browser environment and will not exist in NodeJS.
 * @name ExtensionNotInstalledError
 * @constructor
 * @memberof module:vanadium.verror
 * @extends Error
 */
function ExtensionNotInstalledError(message) {
  this.name = 'ExtensionNotInstalledError';
  this.message = message || [
    'Error connecting to the Vanadium Chrome Extension.  Please make ',
    'sure the extension is installed and enabled.  Download it here: ',
    consts.extensionUrl
  ].join('');
}
inherits(ExtensionNotInstalledError, Error);
