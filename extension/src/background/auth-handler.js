// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Handles auth requests to Nacl.
 */

var _ = require('lodash');

var getOrigin = require('./util').getOrigin;
var random = require('../../../src/lib/random');

module.exports = AuthHandler;

function AuthHandler(channel) {
  if (!(this instanceof AuthHandler)) {
    return new AuthHandler(channel);
  }

  this._channel = channel;

  // Map for tabIds to ports.
  this._ports = {};
}

// Get an access token from the chrome.identity API.
// See https://developer.chrome.com/apps/app_identity
AuthHandler.prototype.getAccessToken = function(cb) {
  if (process.env.TEST_ACCESS_TOKEN) {
    return process.nextTick(cb.bind(null, null, process.env.TEST_ACCESS_TOKEN));
  }

  // This will return an access token for the profile that the user is
  // signed in to chrome as.  If the user is not signed in to chrome, an
  // OAuth window will pop up and ask them to sign in.
  //
  // For now, we don't have a way to ask the user which profile they would
  // like to use.  However, once the `chrome.identity.getAccounts` API call
  // gets out of dev/beta channel, we can get a list of accounts and prompt
  // the user for which one they would like to use with vanadium.
  chrome.identity.getAuthToken({
    interactive: true
  }, function(token) {
    // Wrap in process.nextTick so chrome stack traces can use sourceMap.
    process.nextTick(function(){
      if (chrome.runtime.lastError) {
        console.error('Error getting auth token.', chrome.runtime.lastError);
        return cb(chrome.runtime.lastError);
      }

      return cb(null, token);
    });
  });
};

// Get the name of all accounts from wspr.  Will be empty if no root account
// exists.
AuthHandler.prototype.getAccounts = function(cb) {
  this._channel.performRpc('auth:get-accounts', {}, cb);
};

// Get an access token from the user and use it to create the root account on
// wspr.
AuthHandler.prototype.createAccount = function(cb) {
  var ah = this;
  this.getAccessToken(function(err, token) {
    if (err) {
      return cb(err);
    }

    // If getAccessToken returns an empty token we shouldn't send it to the
    // identity server. Instead we directly pass an error to the callback which
    // will purge the cache and try again.
    if (!token) {
      return cb(new Error('getAccessToken returned an empty token.'), null,
        token);
    }

    ah._channel.performRpc('auth:create-account', {token: token},
      function(err, createdAccount) {
        cb(err, createdAccount, token);
      });
  });
};

// Check if an origin is already associated with an account on wspr.
AuthHandler.prototype.originHasAccount = function(origin, cb) {
  this._channel.performRpc('auth:origin-has-account', {origin: origin}, cb);
};

// Associate the account with the origin on wspr.
AuthHandler.prototype.associateAccount =
  function(account, origin, caveats, cb) {
    this._channel.performRpc('auth:associate-account', {
      account: account,
      origin: origin,
      caveats: caveats
    }, cb);
};

// Pop up a new tab asking the user to chose their caveats.
AuthHandler.prototype.getCaveats = function(account, origin, port) {
  var tabId = port.sender.tab.id;
  if (this._ports[tabId]) {
    // Authorization is already in progress. Do nothing.
    console.log('Authorization is already in progress for tab: ' + tabId);
    return;
  }

  // Store the port by its tab id.
  this._ports[tabId] = port;

  // Store the account name and a random salt on the port.
  port.account = account;
  port.authState = random.hex();

  // Get  currently active tab in the window.
  var windowId = port.sender.tab.windowId;
  chrome.tabs.query({active: true, windowId: windowId}, function(tabs) {
    // Store the current tab id so we can switch back to it after the addcaveats
    // tab is removed.  Note that the currently active tab might not be the same
    // as the tab that is requesting authentication.
    if (tabs && tabs[0] && tabs[0].id) {
      port.currentTabId = tabs[0].id;
    }

    chrome.tabs.create({
      url: chrome.extension.getURL('html/addcaveats.html') + '?webappId=' +
        port.sender.tab.id + '&origin=' + encodeURIComponent(origin) +
        '&authState=' + port.authState
    });
  });
};

// Handle incoming 'auth' message.
AuthHandler.prototype.handleAuthMessage = function(port) {
  port.postMessage({
    type: 'auth:received'
  });

  var origin;
  try {
    origin = getOrigin(port.sender.url);
  } catch (err) {
    return sendErrorToContentScript('auth', port, err);
  }

  var ah = this;

  this.getAccounts(function(err, accounts) {
    if (err) {
      return sendErrorToContentScript('auth', port, err);
    }

    if (!accounts || accounts.length === 0) {
      // No account exists.  Create one and then call getCaveats.
      var retry = true;
      var createAccountCallback = function(err, createdAccount, token) {
        if (err) {
          // If the token we received from chrome.identity.getAuthToken failed
          // to authenticate for the identity server, it may because that the
          // cached token has expired.
          // So, we remove the token from the cache and retry once.
          // TODO(suharshs,nlacasse): Filter by a more specific set of errors.
          if (retry && token) {
            retry = false;
            return chrome.identity.removeCachedAuthToken({
              'token': token
            }, function(){
              ah.createAccount(createAccountCallback);
            });
          } else if (retry) {
            // If the token was not returned from getAuthToken, force the logout
            // of the user and try again.
            // This usually happens when a user has changed their password from
            // a different browser instance and the current browser isn't logged
            // into their new account.
            return chrome.identity.launchWebAuthFlow({
              'url': 'https://accounts.google.com/logout'
            }, function(tokenUrl) {
              ah.createdAccount(createAccountCallback);
            });
          }
          return sendErrorToContentScript('auth', port, err);
        }
        ah.getCaveats(createdAccount, origin, port);
      };

      ah.createAccount(createAccountCallback);
    } else {
      // At least one account already exists. Use the first one.
      var account = accounts[0];

      // Check if origin is associated.
      ah.originHasAccount(origin, function(err, hasAccount) {
        if (err) {
          return sendErrorToContentScript('auth', port, err);
        }

        if (hasAccount) {
          // Origin already associated.  Return success.
          port.postMessage({
            type: 'auth:success',
            account: account
          });
        } else {
          // No origin associated.  Get caveats and then associate.
          ah.getCaveats(account, origin, port);
        }
      });
    }
  });
};

AuthHandler.prototype.handleFinishAuth = function(caveatsPort, msg) {
  if (caveatsPort.sender.url.indexOf(chrome.extension.getURL(
      'html/addcaveats.html')) !== 0) {
    console.error('invalid requester for associateAccount:finish');
    return;
  }

  // Remove the caveats tab.
  chrome.tabs.remove(caveatsPort.sender.tab.id);

  var webappPort = this._ports[msg.webappId];
  delete this._ports[msg.webappId];

  if (!webappPort) {
    return console.error('No webapp port found.');
  }

  // Switch back to the last active tab.
  if (webappPort.currentTabId) {
    chrome.tabs.update(webappPort.currentTabId, {active: true});
  }

  if (msg.cancel) {
    return sendErrorToContentScript('auth', webappPort,
        new Error('User declined to bless origin.'));
  }

  if (msg.origin !== getOrigin(webappPort.sender.url)) {
    return sendErrorToContentScript('auth', webappPort,
        new Error('Invalid origin.'));
  }

  if (msg.authState !== webappPort.authState) {
    return sendErrorToContentScript('auth', webappPort,
        new Error('Port not authorized.'));
  }

  if (!webappPort.account) {
    return sendErrorToContentScript('auth', webappPort,
        new Error('No port.account.'));
  }

  if (!msg.caveats || msg.caveats.length === 0) {
    return sendErrorToContentScript('auth', webappPort,
        new Error('No caveats selected'));
  }

  this.associateAccount(webappPort.account, msg.origin, msg.caveats,
    function(err) {
      if (err) {
        return sendErrorToContentScript('auth', webappPort, err);
      }
      webappPort.postMessage({
        type: 'auth:success',
        account: webappPort.account
      });
    });
};

AuthHandler.prototype.getAllPorts = function() {
  return _.values(this._ports);
};

// Convert an Error object into a bare Object with the same properties.  We do
// this because port.postMessage calls JSON.stringify, which ignores the message
// and stack properties on Error objects.
function errorToObject(err) {
  var obj = {};
  Object.getOwnPropertyNames(err).forEach(function(key) {
    obj[key] = err[key];
  });
  return obj;
}

// Helper functions to send error message back to calling content script.
function sendErrorToContentScript(type, port, err) {
  console.error(err);
  port.postMessage({
    type: type + ':error',
    error: errorToObject(err)
  });
}
