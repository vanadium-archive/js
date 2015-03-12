var inherits = require('inherits');

var consts = require('./extension-consts');

module.exports = {
  ExtensionCrashError: ExtensionCrashError,
  ExtensionNotInstalledError: ExtensionNotInstalledError,
};

// ExtensionCrashError indicates that the Vanadium extension has crashed.
function ExtensionCrashError(message) {
  this.name = 'ExtensionCrashError';
  this.message = message || [
    'The Vanadium extension has crashed.  It is necessary to reload this page ',
    'for Vanadium to continue to to fully function.'
  ].join('');
}
inherits(ExtensionCrashError, Error);

// ExtensionNotInstalledError indicates that the Vanadium extension is not
// installed.
function ExtensionNotInstalledError(message) {
  this.name = 'ExtensionNotInstalledError';
  this.message = message || [
    'Error connecting to the Vanadium Chrome Extension.  Please make ',
    'sure the extension is installed and enabled.  Download it here: ',
    consts.extensionUrl
  ].join('');
}
inherits(ExtensionNotInstalledError, Error);