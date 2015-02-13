var inherits = require('util').inherits;

var Deferred = require('./deferred');

var extensionId = 'jcaelnibllfoobpedofhlaobfcoknpap';
var extensionUrl = 'https://chrome.google.com/webstore/detail/' + extensionId;

module.exports = {
  ExtensionNotInstalledError: ExtensionNotInstalledError,
  isExtensionInstalled: isExtensionInstalled
};

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

inherits(ExtensionNotInstalledError, Error);
