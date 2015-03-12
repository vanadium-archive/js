var extend = require('xtend');
var isBrowser = require('is-browser');

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