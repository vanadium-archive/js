var debug = require('debug')('wspr');
if (typeof window !== 'undefined') {
  window.debug = require('debug');
}

var WSPR = require('./wspr');
var init = require('../init');

var wspr;

// Wait for state.settings to get hydrated from storage.
init(function(err){
  if (err) {
    return console.error('Error during init.', err);
  }

  // Set wspr so it can be accessed by all functions in this module.
  wspr = new WSPR(getWsprUrl());

  // Start listening connections from content scripts.
  chrome.runtime.onConnect.addListener(contentScriptListener);
});

// Listen for messages from the content script and dispatch as necessary.
// Currently the only message we care about is "auth".
function contentScriptListener(port) {
  port.onMessage.addListener(function(msg){
    debug('background received message from content script.', msg);
    if (msg.type === 'auth') {
      return handleAuthRequest(port);
    }
    console.error('unknown message.', msg);
  });
}

function handleAuthRequest(port) {
  getAuthToken(function(err, token) {
    if (err) {
      return sendError('auth', port, err);
    }

    var origin;
    try {
      origin = getOrigin(port.sender.url);
    } catch (err) {
      return sendError('auth', port, err);
    }

    wspr.createAndAssocAccount(token, origin, function(err, name) {
      if (err) {
        return sendError('auth', port, err);
      }

      port.postMessage({
        type: 'auth:success',
        name: name
      });
    });
  });
}

// Get an access token from the chrome.identity API
// See https://developer.chrome.com/apps/app_identity
function getAuthToken(callback){
  // This will return an access token for the profile that the user is
  // signed in to chrome as.  If the user is not signed in to chrome, an
  // OAuth window will pop up and ask them to sign in.
  //
  // For now, we don't have a way to ask the user which profile they would
  // like to use.  However, once the `chrome.identity.getAccounts` API call
  // gets out of dev/beta channel, we can get a list of accounts and prompt
  // the user for which one they would like to use with veyron.
  chrome.identity.getAuthToken({ interactive: true }, function(token){
    if (chrome.runtime.lastError) {
      console.error('Error getting auth token.', chrome.runtime.lastError);
      return callback(chrome.runtime.lastError);
    }

    return callback(null, token);
  });
}

// Helper functions to send error message back to calling content script.
function sendError(type, port, err) {
  port.postMessage({
    type: type + ':error',
    error: err
  });
}

// Parse a url and return the origin.
function getOrigin(url) {
  var URL = require('url');
  var parsed = URL.parse(url);
  return parsed.protocol + '//' + parsed.host;
}

// Get the WSPR url out of the settings.
function getWsprUrl() {
  var state = require('../state');
  var settings = state.settings().collection;
  var _ = require('lodash');

  var wsprSetting = _.find(settings, function(setting) {
    return (setting.key === 'wspr');
  });

  return wsprSetting.value;
}

debug('background script loaded');
