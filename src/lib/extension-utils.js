var inherits = require('inherits');

var Deferred = require('./deferred');

var extensionId = 'jcaelnibllfoobpedofhlaobfcoknpap';
var extensionUrl = 'https://chrome.google.com/webstore/detail/' + extensionId;

module.exports = {
  ExtensionCrashError: ExtensionCrashError,
  ExtensionNotInstalledError: ExtensionNotInstalledError,
  isExtensionInstalled: isExtensionInstalled
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
    extensionUrl
  ].join('');
}

inherits(ExtensionNotInstalledError, Error);

// isExtensionInstalled checks if the Vanadium extension is installed by making
// a request to a web accessible image.
// See http://stackoverflow.com/questions/8042548
function isExtensionInstalled(cb) {
  var def = new Deferred(cb);

  var imgUrl = 'chrome-extension://' + extensionId + '/images/1x1.png';

  var img = window.document.createElement('img');
  img.setAttribute('src', imgUrl);

  img.addEventListener('load', function() {
    def.resolve(true);
  });
  img.addEventListener('error', function() {
    def.resolve(false);
  });

  return def.promise;
}
