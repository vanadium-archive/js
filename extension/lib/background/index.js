var _ = require('lodash');
var debug = require('debug')('background:index');
var domready = require('domready');

var getOrigin = require('./util').getOrigin;
var Nacl = require('./nacl');
var AuthHandler = require('./auth-handler');

domready(function() {
  // Start!
  var bp = new BackgroundPage();
  chrome.runtime.onConnect.addListener(
    bp.handleNewContentScriptConnection.bind(bp));
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
    try {
      port.postMessage({type: 'browsprCleanupFinished'});
    } catch (e) {
      // This will error if the port has been closed, usually due to the tab
      // being closed or navigating to a new page.  Safe to ignore.
    }
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

  var pId = portId(port);

  this.instanceIds[pId] = _.remove(this.instanceIds[pId], [instanceId]);
  delete this.ports[instanceId];

  this.nacl.cleanupInstance(instanceId, function() {
    console.log('Cleaned up instance: ' + instanceId);
    sendCleanupFinishedMessage();
  });
};

// Handle messages that will be sent to Nacl.
BackgroundPage.prototype.handleBrowsprMessage = function(port, msg) {
  if (!this.naclPluginIsActive()) {
    // Start the plugin if it is not started.
    this.startNaclPlugin();
  }

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

  // Cache the origin on the port object.
  port.origin = port.origin || getOrigin(port.sender.tab.url);

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

// Restart nacl when it crashes.
BackgroundPage.prototype.handleNaclCrash = function() {
  // Log the crash to the extension's console.
  console.error('NACL plugin crashed.');

  // Restart the plugin
  this.stopNaclPlugin();

  // Notify all content scripts about the failure.
  var crashNotificationMsg = {
    type: 'crash'
  };
  var ports = this.ports;
  Object.keys(ports).forEach(function(instanceId) {
    try {
      ports[instanceId].postMessage(crashNotificationMsg);
    } catch (e) {
      // Port no longer exists.  Safe to ignore.
    }
  });
};
