var _ = require('lodash');
var debug = require('debug')('component:settings');
var mercury = require('mercury');
var h = mercury.h;

var setting = require('./setting');
var storage = require('../../storage');

// Temporary method of dealing with CSS
var fs = require('fs');
var insert = require('insert-css');
var css = fs.readFileSync(__dirname + '/index.css');

module.exports = create;
module.exports.render = render;

var defaults = {
  wspr: 'http://localhost:8124'
};

function render(settings) {
  debug('rendering', settings);
  insert(css);

  return h('div', [
    h('form.settings', _.map(settings, setting.render)),
    'Manage your identities here: chrome://identity-internals/'
  ]);
}

function create(settingsObj) {
  debug('initializing');

  settingsObj = settingsObj || defaults;

  var state = mercury.varhash({});
  hydrateState(state, settingsObj);

  // Async load settings from storage.
  loadFromStorage(state);

  // Store any changes in storage.
  state(sendToStorage);

  return { state: state };
}

// Hydrate the state varhash with settings from obj.
function hydrateState(state, obj) {
  _.forEach(obj, function(value, key) {
    state.put(key, setting(key, value, defaults[key]).state);
  });
}

// Turn the state varhash into a bare object.
function dehydrateState(state) {
  var obj = {};
  _.forEach(state, function(value, key) {
    obj[key] = value.value;
  });
  return obj;
}

// Load the state varhash from storage.
function loadFromStorage(state){
  storage.get('settings', function(err, settings) {
    if (err) {
      console.error(err);
    }
    hydrateState(state, settings);
  });
}

// Send the state varhash to storage.
function sendToStorage(state) {
  storage.set('settings', dehydrateState(state), function(err) {
    if (err) {
      return console.error(err);
    }
  });
}
