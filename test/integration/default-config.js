var isBrowser = require('is-browser');

// Use 'null' in browser to use nacl plugin.
var wspr = isBrowser ? null : 'http://' + process.env.WSPR_ADDR;

module.exports = {
  wspr: wspr
};
