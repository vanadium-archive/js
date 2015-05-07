// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Handles auth requests to Nacl.
 */

var getOrigin = require('./util').getOrigin;
var random = require('../../../src/lib/random');

module.exports = AuthHandler;

function AuthHandler(channel) {
  if (!(this instanceof AuthHandler)) {
    return new AuthHandler(channel);
  }

  this._channel = channel;

  // Auth request id, incremented on each auth request.
  this._lastRequestId = 0;

  // Map from origins to the Vanadium app ports of tabs with active requests.
  // This keeps track of existing auth tabs for an origin so new ones are not
  // started.
  this._outstandingAuthRequests = {};

  // Map from caveat tab id to origin.
  this._caveatTabOrigins = {};

  // Handle tabs being closed.
  chrome.tabs.onRemoved.addListener(this.onRemovedTab.bind(this));
}

AuthHandler.prototype.onRemovedTab = function(tabId) {
  var origin = this._caveatTabOrigins[tabId];
  if (!origin) {
    return; // Not one of the caveat tabs.
  }

  delete this._caveatTabOrigins[tabId];

  if (origin in this._outstandingAuthRequests) {
    this.finishAuth({
      origin: origin,
      cancel: true,
    });
  }
};

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
AuthHandler.prototype.getCaveats = function(account, origin, appPort) {
  var outstandingAuthRequests = this._outstandingAuthRequests;
  if (origin in this._outstandingAuthRequests) {
    outstandingAuthRequests[origin].push(appPort);
    return;
  }

  this._lastRequestId++;
  var requestId = this._lastRequestId;

  // Store the account name, random salt, and timestamp on the port.
  appPort.account = account;
  appPort.authState = random.hex();

  // Get  currently active tab in the window.
  var windowId = appPort.sender.tab.windowId;
  var caveatTabOrigins = this._caveatTabOrigins;
  chrome.tabs.query({active: true, windowId: windowId}, function(tabs) {
    // Store the current tab id so we can switch back to it after the addcaveats
    // tab is removed.  Note that the currently active tab might not be the same
    // as the tab that is requesting authentication.
    if (tabs && tabs[0] && tabs[0].id) {
      appPort.currentTabId = tabs[0].id;
    }

    chrome.tabs.create({
      url: chrome.extension.getURL('html/addcaveats.html') + '?requestId=' +
        requestId + '&origin=' + encodeURIComponent(origin) +
        '&authState=' + appPort.authState
    }, function(tab) {
      outstandingAuthRequests[origin] = [appPort];
      caveatTabOrigins[tab.id] = origin;
    });
  });
};

// Handle incoming 'auth' message.
AuthHandler.prototype.handleAuthMessage = function(appPort) {
  appPort.postMessage({
    type: 'auth:received'
  });

  var origin;
  try {
    origin = getOrigin(appPort.sender.url);
  } catch (err) {
    return sendErrorToContentScript('auth', appPort, err);
  }

  var ah = this;

  this.getAccounts(function(err, accounts) {
    if (err) {
      return sendErrorToContentScript('auth', appPort, err);
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
          return sendErrorToContentScript('auth', appPort, err);
        }
        ah.getCaveats(createdAccount, origin, appPort);
      };

      ah.createAccount(createAccountCallback);
    } else {
      // At least one account already exists. Use the first one.
      var account = accounts[0];

      // Check if origin is associated.
      ah.originHasAccount(origin, function(err, hasAccount) {
        if (err) {
          return sendErrorToContentScript('auth', appPort, err);
        }

        if (hasAccount) {
          // Origin already associated.  Return success.
          appPort.postMessage({
            type: 'auth:success',
            account: account
          });
        } else {
          // No origin associated.  Get caveats and then associate.
          ah.getCaveats(account, origin, appPort);
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


  this.finishAuth(msg);

  // Close the caveats tab.
  // Note: This triggers a call onRemovedTab().
  chrome.tabs.remove(caveatsPort.sender.tab.id);
};

AuthHandler.prototype.finishAuth = function(msg) {
  var appPorts = this._outstandingAuthRequests[msg.origin];
  delete this._outstandingAuthRequests[msg.origin];
  if (!Array.isArray(appPorts)) {
    console.error('Finish auth flow request received for unknown origin');
    return;
  }

  var self = this;
  appPorts.forEach(function(appPort) {
    if (msg.origin !== getOrigin(appPort.sender.url)) {
      console.error('Invalid origin.');
      return;
    }

    if (msg.cancel) {
      return sendErrorToContentScript('auth', appPort,
          new Error('User declined to bless origin.'));
    }

    if (msg.origin !== getOrigin(appPort.sender.url)) {
      return sendErrorToContentScript('auth', appPort,
          new Error('Invalid origin.'));
    }

    if (msg.authState !== appPort.authState) {
      return sendErrorToContentScript('auth', appPort,
          new Error('Port not authorized.'));
    }

    if (!appPort.account) {
      return sendErrorToContentScript('auth', appPort,
          new Error('No port.account.'));
    }

    if (!msg.caveats || msg.caveats.length === 0) {
      return sendErrorToContentScript('auth', appPort,
          new Error('No caveats selected'));
    }

    self.associateAccount(appPort.account, msg.origin, msg.caveats,
      function(err) {
        if (err) {
          return sendErrorToContentScript('auth', appPort, err);
        }
        appPort.postMessage({
          type: 'auth:success',
          account: appPort.account
        });
      });
  });
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
