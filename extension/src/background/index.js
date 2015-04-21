// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var _ = require('lodash');
var debug = require('debug')('background:index');
var domready = require('domready');

var AuthHandler = require('./auth-handler');
var extensionErrors = require('../../../src/browser/extension-errors');
var getOrigin = require('./util').getOrigin;
var Nacl = require('./nacl');


domready(function() {
  // Start!
  var bp = new BackgroundPage();
  chrome.runtime.onConnect.addListener(
    bp.handleNewContentScriptConnection.bind(bp));

  // Set bp on the window so it will be accessable from options page.
  window.bp = bp;
  // Expose the state object so options page and background can share it and
  // stay in sync.
  bp.state = require('../state');
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

  debug('background script loaded');
}

// Start listening to messages from the Nacl plugin.
BackgroundPage.prototype.registerNaclListeners = function() {
  this.nacl.on('message', this.handleMessageFromNacl.bind(this));
  this.nacl.on('crash', this.handleNaclCrash.bind(this));
};

// Handle messages coming from Nacl by send them to the associated port.
BackgroundPage.prototype.handleMessageFromNacl = function(msg) {
  var instanceId = msg.instanceId;
  var port = this.ports[instanceId];
  if (!port) {
    console.error('Message received not matching instance id: ', instanceId);
    return;
  }
  port.postMessage(msg);
};


// Handle messages coming from a content script.
BackgroundPage.prototype.handleMessageFromContentScript = function(port, msg) {
  if (!this.naclPluginIsActive()) {
    // Start the plugin if it is not started.
    this.startNaclPlugin();
  }

  // Wrap in process.nextTick so chrome stack traces can use sourceMap.
  var bp = this;
  process.nextTick(function() {
    debug('background received message from content script.', msg);

    // Dispatch on the type of the message.
    switch (msg.type) {
      case 'browsprMsg':
        return bp.handleBrowsprMessage(port, msg);
      case 'browsprCleanup':
        return bp.handleBrowsprCleanup(port, msg);
      case 'createInstance':
        return bp.handleCreateInstance(port, msg);
      case 'auth':
        return bp.authHandler.handleAuthMessage(port);
      case 'assocAccount:finish':
        return bp.authHandler.handleFinishAuth(port, msg);
      case 'intentionallyPanic': // Only for tests.
        return bp._triggerIntentionalPanic();
      default:
        console.error('unknown message.', msg);
    }
  });
};

// Trigger a panic in the plug-in (only for tests).
BackgroundPage.prototype._triggerIntentionalPanic = function() {
  if (process.env.ALLOW_INTENTIONAL_CRASH) {
      var panicMsg = {
        type: 'intentionallyPanic',
        instanceId: 0,
        origin: '',
        body: ''
      };
      this.nacl.sendMessage(panicMsg);
    }
};

// Handle a content script connecting to this background script.
BackgroundPage.prototype.handleNewContentScriptConnection = function(port) {
  port.onMessage.addListener(
    this.handleMessageFromContentScript.bind(this, port));

  var bp = this;
  port.onDisconnect.addListener(function() {
    var pId = portId(port);
    var instanceIds = bp.instanceIds[pId] || [];
    instanceIds.forEach(function(instanceId) {
      bp.handleBrowsprCleanup(port, {body: {instanceId: instanceId}});
    });
  });
};

// Clean up an instance, and tell Nacl to clean it up as well.
BackgroundPage.prototype.handleBrowsprCleanup = function(port, msg) {
  function sendCleanupFinishedMessage() {
    safePostMessage(port, {type: 'browsprCleanupFinished'});
  }

  if (!this.naclPluginIsActive()) {
    // If the plugin isn't started, no need to clean it up.
    sendCleanupFinishedMessage();
    return;
  }

  var instanceId = msg.body.instanceId;

  if (!this.ports[instanceId]) {
    return console.error('Got cleanup message from instance ' + instanceId +
        ' with no associated port.');
  }

  if (this.ports[instanceId] !== port) {
    return console.error('Got cleanup message for instance ' + instanceId +
        ' that does not match port.');
  }

  var bp = this;
  var now = Date.now();
  this.nacl.cleanupInstance(instanceId, function() {
    var end = Date.now();
    console.log('Cleaned up instance: ' + instanceId + ' in '
                + (end - now) + ' ms');
    var pId = portId(port);
    bp.instanceIds[pId] = _.remove(bp.instanceIds[pId], [instanceId]);
    delete bp.ports[instanceId];
    sendCleanupFinishedMessage();
  });
};

BackgroundPage.prototype.isValidMessageForPort = function(msg, port) {
  var body = msg.body;
  if (!body) {
    console.error('Got message with no body: ', msg);
    return false;
  }
  if (!body.instanceId) {
    console.error('Got message with no instanceId: ', msg);
    return false;
  }
  if (this.ports[body.instanceId] && this.ports[body.instanceId] !== port) {
    console.error('Got browspr message with instanceId ' +
        body.instanceId + ' that does not match port.');
    return false;
  }
  return true;
};

BackgroundPage.prototype.assocPortAndInstanceId = function(port, instanceId) {
  // Store the instanceId->port.
  this.ports[instanceId] = port;
  // Store the portId->instanceId.
  var portId = port.sender.tab.id;
  this.instanceIds[portId] =
      _.union(this.instanceIds[portId] || [], [instanceId]);

  // Cache the origin on the port object.
  port.origin = port.origin || getOrigin(port.sender.tab.url);
};


// Handle an createInstance message.
BackgroundPage.prototype.handleCreateInstance = function(port, msg) {
  if (!this.isValidMessageForPort(msg, port)) {
    return console.error('Invalid port for message.  Ignoring.');
  }

  var body = msg.body;
  this.assocPortAndInstanceId(port, body.instanceId);

  this.nacl.channel.performRpc('create-instance', {
    instanceId: body.instanceId,
    origin: port.origin,
    namespaceRoots: body.settings.namespaceRoots,
    proxy: body.settings.proxy
  }, function(err) {
    if (err) {
      return safePostMessage(port, {type: 'createInstance:error', error: err});
    }
    safePostMessage(port, {type: 'createInstance:success'});
  });
};

// Handle messages that will be sent to Nacl.
BackgroundPage.prototype.handleBrowsprMessage = function(port, msg) {
  if (!this.isValidMessageForPort(msg, port)) {
    return;
  }

  var body = msg.body;
  this.assocPortAndInstanceId(port, body.instanceId);

  var naclMsg = {
    type: msg.type,
    instanceId: parseInt(body.instanceId),
    origin: port.origin,
    body: body.msg
  };
  return this.nacl.sendMessage(naclMsg);
};

function portId(port) {
  return port.sender.tab.id;
}

// Return true if the nacl plug-in is running.
BackgroundPage.prototype.naclPluginIsActive = function() {
  return this.hasOwnProperty('nacl');
};

// Start the nacl plug-in -- add it to the page and register handlers.
BackgroundPage.prototype.startNaclPlugin = function() {
  var bp = this;
  bp.nacl = new Nacl();
  bp.registerNaclListeners();
  bp.authHandler = new AuthHandler(bp.nacl.channel);
};

// Stop the nacl plug-in - remove it from the page and clean up state.
BackgroundPage.prototype.stopNaclPlugin = function() {
  // TODO(bprosnitz) Should we call nacl.cleanupInstance()?
  this.nacl.destroy();
  delete this.nacl;
};

// Stop and start the nacl plug-in
BackgroundPage.prototype.restartNaclPlugin = function() {
  if (this.naclPluginIsActive()) {
    this.stopNaclPlugin();
  }
  this.startNaclPlugin();
};

// Returns an array of all active port objects.
BackgroundPage.prototype.getAllPorts = function() {
  var ports = [];
  _.forEach(this.ports, function(portArray) {
    ports = ports.concat(portArray);
  });
  // Add ports in use by the auth handler.
  ports = ports.concat(this.authHandler.getAllPorts());
  // Sort the ports array so that _.uniq can use a faster search algorithm.
  ports = _.sortBy(ports);
  // The second argument to _.uniq is whether the array is sorted.
  return _.uniq(ports, true);
};

// Restart nacl when it crashes.
BackgroundPage.prototype.handleNaclCrash = function(msg) {
  // Log the crash to the extension's console.
  console.error('NACL plugin crashed.');
  if (msg) {
    console.error(msg);
  }

  // Restart the plugin
  this.stopNaclPlugin();

  // Notify all content scripts about the failure.
  var crashNotificationMsg = {
    type: 'crash',
    body: new extensionErrors.ExtensionCrashError(msg)
  };
  this.getAllPorts().forEach(function(port) {
    safePostMessage(port, crashNotificationMsg);
  });
};

function safePostMessage(port, msg) {
  try {
    port.postMessage(msg);
  } catch (e) {
    // Port no longer exists.  Safe to ignore.
  }
}
