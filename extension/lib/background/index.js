var _ = require('lodash');
var debug = require('debug')('background:index');
var domready = require('domready');

var AuthHandler = require('./auth-handler');
var getOrigin = require('./util').getOrigin;
var Nacl = require('./nacl');

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

  // Wraps the nacl element.
  this.nacl = new Nacl();

  // Handles auth messages.
  this.authHandler = new AuthHandler(this.nacl);

  debug('background script loaded');
}

// Start listening to messages from Nacl and content scripts.
BackgroundPage.prototype.listen = function() {
  this.nacl.on('message', this.handleMessageFromNacl.bind(this));
  chrome.runtime.onConnect.addListener(
      this.handleMessageFromContentScript.bind(this)
  );
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
BackgroundPage.prototype.handleMessageFromContentScript = function(port) {
  var bp = this;
  port.onMessage.addListener(function(msg) {
    // Wrap in process.nextTick so chrome stack traces can use sourceMap.
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
        default:
          console.error('unknown message.', msg);
      }
    });
  });

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

  this.nacl.channel.performRpc('cleanup', {
    instanceId: instanceId
  }, function (){
    console.log('Cleaned up instance: ' + instanceId);
  });
};

// Handle messages that will be sent to Nacl.
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
