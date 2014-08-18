
var mercury = require('mercury');
var settings = require('./components/settings');
var state;

module.exports = state = mercury.struct({
  settings: settings().state
});
