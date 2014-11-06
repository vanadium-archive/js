var mercury = require('mercury');
var settings = require('./components/settings');
var state;

module.exports = state = mercury.struct({
  error: mercury.value(null),
  settings: settings().state
});

