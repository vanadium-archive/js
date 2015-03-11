var extend = require('xtend');
var isBrowser = require('is-browser');
var extnUtils = require('../lib/extension-utils');

module.exports = extend(require('../gen-vdl/v.io/v23/verror'), {
  makeError: require('./make-errors'),
  actions: require('./actions'),
});

if (isBrowser) {
  // Add ExtensionNotInstalledError and isExtensionInstalled to exports if we
  // are in a browser.
  module.exports.ExtensionNotInstalledError =
    extnUtils.ExtensionNotInstalledError;
}
