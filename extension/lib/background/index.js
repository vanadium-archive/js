var _ = require('lodash');
var debug = require('debug')('background:index');
var domready = require('domready');

var state = require('../state');
var Nacl = require('./nacl');
var random = require('../../../src/lib/random');
var WSPR = require('./wspr');

domready(function() {
  // Start!
  var bp = new BackgroundPage();
  bp.listen();
});

function BackgroundPage() {
  if (!(this instanceof BackgroundPage)) {
    return new BackgroundPage();
  }

  // Map that stores instanceId -> port so messages can be routed back to the
  // port they came from.
  this.ports = {};

  // Map that stores portId -> instanceId so browspr can do cleanup on the
  // instanceId when the port closes.
  this.instanceIds = {};

  this.nacl = new Nacl();

  this._wspr = null;

  debug('background script loaded');
}

// Start listening to messages from Nacl and content scripts.
BackgroundPage.prototype.listen = function() {
  this.nacl.on('message', this.handleMessageFromNacl.bind(this));
  chrome.runtime.onConnect.addListener(
      this.handleMessageFromContentScript.bind(this)
  );
};

BackgroundPage.prototype.getWspr = function(cb) {
  if (this._wspr) {
    return process.nextTick(cb.bind(this, null, this._wspr));
  }

  var wspr = new WSPR(state.settings().wspr.value);

  var bp = this;
  getAuthToken(function(err, token) {
    if (err) {
      return cb(err);
    }
    wspr.createAccount(token, function(err, account) {
      if (err) {
        return cb(err);
      }
      bp.wspr = wspr;
      bp.wspr.rootAccount = account;
      cb(null, bp.wspr);
    });
  });
};

BackgroundPage.prototype.handleMessageFromNacl = function(e) {
  var instanceId = e.data.instanceId;
  if (instanceId === -1) {
    // Message originated from background page. Do not forward.
    return;
  }
  var port = this.ports[instanceId];
  if (!port) {
    console.error('Message received not matching instance id: ', instanceId);
    return;
  }
  var msg = e.data;
  port.postMessage(msg);
};

BackgroundPage.prototype.handleMessageFromContentScript = function(port) {
  var bp = this;
  port.onMessage.addListener(function(msg) {
    debug('background received message from content script.', msg);
    if (msg.type === 'browsprMsg') {
      return bp.handleBrowsprMessage(port, msg);

    }
    if (msg.type === 'browsprCleanup') {
      return bp.handleBrowsprCleanup(port, msg);
    }
    if (msg.type === 'auth') {
      return bp.handleAuthRequest(port);
    }
    if (msg.type === 'assocAccount:finish') {
      if (port.sender.url.indexOf(chrome.extension.getURL(
          'html/addcaveats.html')) !== 0) {
        console.error('invalid requester for assocAccount:finish');
        return;
      }
      return bp.handleFinishAuth({
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
    var pId = portId(port);
    var instanceIds = bp.instanceIds[pId] || [];
    instanceIds.forEach(function(instanceId) {
      bp.handleBrowsprCleanup(instanceId);
    });
    delete bp.instanceIds[pId];
  });
};

BackgroundPage.prototype.handleBrowsprCleanup = function(port, msg) {
  var instanceId = msg.body.instanceId;

  if (!this.ports[instanceId]) {
    return console.error('Got cleanup message from instance ' + instanceId +
        ' with no associated port.');
  }

  if (this.ports[instanceId] !== port) {
    return console.error('Got cleanup message for instance ' + instanceId +
        ' that does not match port.');
  }

  delete this.ports[instanceId];
  this.nacl.sendMessage({
    type: 'browsprCleanup',
    instanceId: instanceId
  });
};

BackgroundPage.prototype.handleBrowsprMessage = function(port, msg) {
  var body = msg.body;
  if (!body) {
    return console.error('Got message with no body: ', msg);
  }
  if (!body.instanceId) {
    return console.error('Got message with no instanceId: ', msg);
  }
  if (this.ports[body.instanceId] && this.ports[body.instanceId] !== port) {
    return console.error('Got browspr message with instanceId ' +
        body.instanceId + ' that does match port.');
  }

  // Store the instanceId->port.
  this.ports[body.instanceId] = port;
  // Store the portId->instanceId.
  var portId = port.sender.tab.id;
  this.instanceIds[portId] =
      _.union(this.instanceIds[portId] || [], [body.instanceId]);

  var naclMsg = {
    type: msg.type,
    instanceId: parseInt(body.instanceId),
    body: body.msg
  };
  return this.nacl.sendMessage(naclMsg);
};

BackgroundPage.prototype.handleAuthRequest = function(port) {
  port.postMessage({
    type: 'auth:received'
  });
  var bp = this;
  this.getWspr(function(err, wspr) {
    if (err) {
      return sendError('auth', port, err);
    }

    if (bp.wspr.rootAccount.length === 0) {
      return sendError('auth', port, new Error(
        'wspr account setup is not complete'));
    }

    var origin;
    try {
      origin = getOrigin(port.sender.url);
    } catch (err) {
      return sendError('auth', port, err);
    }

    port.authState = random().string();

    chrome.tabs.create({
      url: chrome.extension.getURL('html/addcaveats.html') + '?webappId=' +
        port.sender.tab.id + '&origin=' + encodeURIComponent(origin) +
        '&authState=' + port.authState
    });
  });
};

BackgroundPage.prototype.handleFinishAuth = function(args) {
  chrome.tabs.remove(args.addCaveatsId);
  var port = this.ports[args.webappId];
  if (!port || args.authState !== port.authState) {
    return console.error('port not authorized');
  }

  this.getWspr(function(err, wspr) {
    if (err) {
      return sendError('auth', port, err);
    }
    wspr.assocAccount(wspr.rootAccount, args.origin, args.caveats,
      function(err, account) {
        if (err) {
          return sendError('auth', port, err);
        }
        port.postMessage({
          type: 'auth:success',
          body: {
            account: account
          }
        });
    });
  });
};

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

function portId(port) {
  return port.sender.tab.id;
}
