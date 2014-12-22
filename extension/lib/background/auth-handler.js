/**
 * @fileoverview Handles auth requests to Nacl.
 */

var getOrigin = require('./util').getOrigin;
var random = require('../../../src/lib/random');

module.exports = AuthHandler;

function AuthHandler(nacl) {
  if (!(this instanceof AuthHandler)) {
    return new AuthHandler(nacl);
  }

  this._channel = nacl.channel;

  // Map for tabIds to ports.
  this._ports = {};

  // Root account in browspr, from which all webapp accounts are blessed.
  this._rootAccount = null;
}

// Get an access token from the chrome.identity API.
// See https://developer.chrome.com/apps/app_identity
AuthHandler.prototype.getAccessToken = function(cb) {
  // This will return an access token for the profile that the user is
  // signed in to chrome as.  If the user is not signed in to chrome, an
  // OAuth window will pop up and ask them to sign in.
  //
  // For now, we don't have a way to ask the user which profile they would
  // like to use.  However, once the `chrome.identity.getAccounts` API call
  // gets out of dev/beta channel, we can get a list of accounts and prompt
  // the user for which one they would like to use with veyron.
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

AuthHandler.prototype.createAccount = function(cb) {
  var ah = this;
  this.getAccessToken(function(err, token) {
    if (err) {
      return cb(err);
    }

    ah._channel.performRpc('auth:create-account', {token: token}, cb);
  });
};

AuthHandler.prototype.associateAccount = function(origin, caveats, cb) {
  if (!this._rootAccount) {
    return cb(new Error('No root account, cannot associate origin.'));
  }

  this._channel.performRpc('auth:associate-account', {
    account: this._rootAccount,
    origin: origin,
    caveats: caveats
  }, cb);
};

AuthHandler.prototype.getCaveats = function(port) {
  var origin;
  try {
    origin = getOrigin(port.sender.url);
  } catch (err) {
    return sendErrorToContentScript('auth', port, err);
  }

  port.authState = random.hex();

  chrome.tabs.create({
    url: chrome.extension.getURL('html/addcaveats.html') + '?webappId=' +
      port.sender.tab.id + '&origin=' + encodeURIComponent(origin) +
      '&authState=' + port.authState
  });
};

AuthHandler.prototype.handleAuthMessage = function(port) {
  port.postMessage({
    type: 'auth:received'
  });

  this._ports[port.sender.tab.id] = port;

  if (this._rootAccount) {
    this.getCaveats(port);
  } else {
    var ah = this;
    this.createAccount(function(err, account) {
      if (err) {
        return sendErrorToContentScript('auth', port, err);
      }
      ah._rootAccount = account;
      ah.getCaveats(port);
    });
  }
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

  if (!webappPort || msg.authState !== webappPort.authState) {
    return console.error('port not authorized');
  }

  if (!msg.caveats || msg.caveats.length === 0) {
    return console.error('no caveats selected: ', msg );
  }

  var ah = this;
  this.associateAccount(msg.origin, msg.caveats, function(err) {
    if (err) {
      return sendErrorToContentScript('auth', webappPort, err);
    }
    webappPort.postMessage({
      type: 'auth:success',
      account: ah._rootAccount
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
