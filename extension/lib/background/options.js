var domready = require('domready');
var mercury = require('mercury');
var init = require('../init');
var state = require('../state');
var settings = require('../components/settings');
if (typeof window !== 'undefined') {
  window.debug = require('debug');
}

domready(function() {
  init();
  mercury.app(document.body, state, render);
});

function render(state, _diff) {
  return settings.render(state.settings);
}
