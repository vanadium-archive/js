var _ = require('lodash');
var debug = require('debug')('component:settings');
var mercury = require('mercury');
var h = mercury.h;
var xtend = require('xtend');

var setting = require('./setting');
var storage = require('../../storage');

// Temporary method of dealing with CSS
var fs = require('fs');
var insert = require('insert-css');
var css = fs.readFileSync(__dirname + '/index.css');

module.exports = create;
module.exports.render = render;

var defaults = {
  identityd: 'identity/dev.v.io/google',
  identitydBlessingUrl: 'https://auth.dev.v.io:8125/blessing-root',
  namespaceRoot: '/ns.dev.v.io:8101',
  proxy: 'proxy'
};

function render(settings) {
  debug('rendering', settings);
  insert(css);

  return h('div', [
    h('form.settings', _.map(settings, setting.render)),
    h('br'),
    h('br'),
    h('a', {
      href: '#',
      'ev-click': mercury.clickEvent(reloadExtension)
    }, 'Reload extension'),
    h('br'),
    h('br'),
    'Manage your identities here: chrome://identity-internals/'
  ]);
}

function create(settingsObj) {
  debug('initializing');

  settingsObj = settingsObj || defaults;

  var state = mercury.varhash({});

  if (process.env.EXTENSION_SETTINGS) {
    // Load the settings from the environment variable, and don't sync with
    // storage.
    var envSettings;
    try {
      envSettings = JSON.parse(process.env.EXTENSION_SETTINGS);
    } catch(e) {
      throw new Error('Could not parse settings from environment:', e);
    }
    settingsObj = xtend(settingsObj, envSettings);
  } else {
    // Async load settings from storage.
    loadFromStorage(state);

    // Store any changes in storage.
    state(sendToStorage);
  }

  hydrateState(state, settingsObj);

  return {
    state: state
  };
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
function loadFromStorage(state) {
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

// Reload the extension.
function reloadExtension() {
  chrome.runtime.getBackgroundPage(function(bpWindow) {
    // bpWindow is the 'window' object of the background page.
    bpWindow.bp.restartNaclPlugin();
  });
}
