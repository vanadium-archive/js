var debug = require('debug')('background:index');

var state = require('../state');
var Nacl = require('./nacl');
var nacl = new Nacl();
var WSPR = require('./wspr');
var wsprAccount;

// Map that stores tabId -> port so communication can be made using existing
// connections.
var webappPorts = {};

function portId(port) {
  return port.sender.tab.id;
}

// Start listening connections from content scripts.
chrome.runtime.onConnect.addListener(contentScriptListener);

// TODO(nlacasse): Fix this: This code will run before the settings have had
// time to load, so state.settings().wspr.value will always be the default.
var wspr = new WSPR(state.settings().wspr.value);

getAuthToken(function(err, token) {
  if (err) {
    return console.error(err);
  }
  wspr.createAccount(token, function(err, account) {
    if (err) {
      return console.error(err);
    }
    wsprAccount = account;
  });
});

// Listen for messages from the content script and dispatch as necessary.
function contentScriptListener(port) {
  port.onMessage.addListener(function(msg) {
    webappPorts[portId(port)] = port;
    debug('background received message from content script.', msg);
    if (msg.type === 'nacl') {
      return handleNaclRequest(port, msg.body);
    }
    if (msg.type === 'auth') {
      return handleAuthRequest(port);
    }
    if (msg.type === 'assocAccount:finish') {
      if (port.sender.url.indexOf(chrome.extension.getURL(
          'html/addcaveats.html')) !== 0) {
        console.error('invalid requester for assocAccount:finish');
        return;
      }
      return handleFinishAuth({
        webappId: msg.webappId,
        origin: msg.origin,
        account: msg.account,
        caveats: msg.caveats,
        addCaveatsId: port.sender.tab.id,
        authState: msg.authState
      });
    }
    console.error('unknown message.', msg);
  });

  port.onDisconnect.addListener(function() {
    delete webappPorts[portId(port)];
  });
}

// Start listening for messages from Nacl once the dom is loaded.
nacl.on('message', naclListener);

// Listens for messages from nacl and sends them back to the port from whence
// they came.
function naclListener(e) {
  var instanceID = e.data.instanceID;
  var msg = {
    type: 'nacl',
    body: e.data.body
  };
  var port = webappPorts[instanceID];
  if (!port) {
    console.error('Message received not matching instance id: ', instanceID);
    return;
  }
  port.postMessage(msg);
}

// Handle requests from the page with type 'nacl'.
function handleNaclRequest(port, body) {
  body.instanceID = portId(port);
  nacl.sendMessage(body);
}

// Handle requests from the page with type 'auth'.
function handleAuthRequest(port) {
  port.postMessage({
    type: 'auth:received'
  });
  if (wsprAccount.length === 0) {
    return sendError('auth', port, new Error(
      'wspr account setup is not complete'));
  }

  var origin;
  try {
    origin = getOrigin(port.sender.url);
  } catch (err) {
    return sendError('auth', port, err);
  }

  port.authState = Math.random().toString(16).substring(2);

  chrome.tabs.create({
    url: chrome.extension.getURL('html/addcaveats.html') + '?webappId=' +
      port.sender.tab.id + '&origin=' + encodeURIComponent(origin) +
      '&authState=' + port.authState
  });
}

function handleFinishAuth(args) {
  chrome.tabs.remove(args.addCaveatsId);
  var webappPort = webappPorts[args.webappId];
  if (!webappPort || args.authState !== webappPort.authState) {
    return console.error('port not authorized');
  }
  wspr.assocAccount(wsprAccount, args.origin, args.caveats,
    function(err, account) {
      if (err) {
        return sendError('auth', webappPort, err);
      }
      webappPort.postMessage({
        type: 'auth:success',
        body: {
          account: account
        }
      });
    });
}

// Get an access token from the chrome.identity API
// See https://developer.chrome.com/apps/app_identity
function getAuthToken(callback) {
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
    if (chrome.runtime.lastError) {
      console.error('Error getting auth token.', chrome.runtime.lastError);
      return callback(chrome.runtime.lastError);
    }

    return callback(null, token);
  });
}

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
function sendError(type, port, err) {
  port.postMessage({
    type: type + ':error',
    body: {
      error: errorToObject(err)
    }
  });
}

// Parse a url and return the origin.
function getOrigin(url) {
  var URL = require('url');
  var parsed = URL.parse(url);
  return parsed.protocol + '//' + parsed.host;
}

debug('background script loaded');
