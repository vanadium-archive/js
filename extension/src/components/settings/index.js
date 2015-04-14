// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var _ = require('lodash');
var debug = require('debug')('component:settings');
var mercury = require('mercury');
var h = mercury.h;
var xtend = require('xtend');

var setting = require('./setting');

// Temporary method of dealing with CSS
var fs = require('fs');
var insert = require('insert-css');
var css = fs.readFileSync(__dirname + '/index.css');

module.exports = create;
module.exports.render = render;

var defaults = {
  identityd: 'identity/dev.v.io/root/google',
  identitydBlessingUrl: 'https://dev.v.io/auth/blessing-root',
  namespaceRoot: '/ns.dev.v.io:8101',
  proxy: 'proxy',
  logLevel: '0',
  logModule: ''
};

function render(settings) {
  debug('rendering', settings);
  insert(css);

  return h('div', [
    h('h3', 'Vanadium NaCl Plugin Options'),
    'These settings are used to configure the Vanadium NaCl plugin.',
    'You should use the defaults unless you know what you are doing.',
    h('br'),
    h('br'),
    'NOTE: You must reload the plugin (see button below) ' +
    'for any changes to take effect.',
    h('br'),
    h('br'),
    h('form.settings', _.map(settings, setting.render)),
    h('br'),
    h('br'),
    h('a', {
      href: '#',
      'ev-click': mercury.clickEvent(reloadExtension)
    }, 'Reload plugin'),
    h('br'),
    h('br'),
    'Manage your identities here: chrome://identity-internals/'
  ]);
}

function create() {
  debug('initializing');

  var settingsObj = defaults;

  var state = mercury.varhash({});

  if (process.env.EXTENSION_SETTINGS) {
    // Load the settings from the environment variable.
    var envSettings;
    try {
      envSettings = JSON.parse(process.env.EXTENSION_SETTINGS);
    } catch(e) {
      throw new Error('Could not parse settings from environment: ', e);
    }
    settingsObj = xtend(settingsObj, envSettings);
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

// Reload the extension.
function reloadExtension() {
  chrome.runtime.getBackgroundPage(function(bpWindow) {
    // bpWindow is the 'window' object of the background page.
    bpWindow.bp.restartNaclPlugin();
  });
}
