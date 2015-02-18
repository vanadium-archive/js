var EE = require('eventemitter2').EventEmitter2;
var inherits = require('util').inherits;

var types = require('./event-proxy-message-types');
var extnUtils = require('../lib/extension-utils');

var defaultTimeout = 5000; // ms

// ExtensionEventProxy sends messages to the extension, and listens for messages
// coming from the extension.
function ExtensionEventProxy(timeout){
  if (!(this instanceof ExtensionEventProxy)) {
    return new ExtensionEventProxy(timeout);
  }

  if (typeof timeout === 'undefined') {
    timeout = defaultTimeout;
  }

  EE.call(this);
  var proxy = this;
  this.onEvent = function(ev) {
    proxy.emit(ev.detail.type, ev.detail.body);
  };
  window.top.addEventListener(types.TO_PAGE, this.onEvent);

  this.waitingForExtension = true;

  // Queue of messages to send once we know the extension event proxy is
  // listening.
  this.queuedMessages = [];

  // Check to see if the extension is installed.
  extnUtils.isExtensionInstalled(function(err, isInstalled) {
    if (err) {
      proxy.emit('error', err);
    }

    // If not installed, emit ExtensionNotInstalledError.
    if (!isInstalled) {
      proxy.emit('error', new extnUtils.ExtensionNotInstalledError());
      return;
    }

    // Otherwise, wait until the extension has loaded and is responding to
    // messages.
    proxy.waitForExtension(timeout);
  });

  // Echo any errors or crashes we receive to the console.
  this.on('error', function(err) {
    console.error('Error message received from content script: ' + err);
  });
  this.on('crash', function() {
    console.error('Crash message received from content script.');
  });
}

inherits(ExtensionEventProxy, EE);

ExtensionEventProxy.prototype.destroy = function() {
  this.removeAllListeners();
  window.top.removeEventListener(types.TO_PAGE, this.onEvent);
};

ExtensionEventProxy.prototype.send = function(type, body) {
  // If we are still waiting for the extension, queue messages to be sent later.
  if (this.waitingForExtension) {
    this.queuedMessages.push({
      type: type,
      body: body
    });
    return;
  }

  window.top.dispatchEvent(
    new window.CustomEvent(types.TO_EXTENSION, {
      detail: {
        type: type,
        body: body
      }
    })
  );
};

// Repeatedly ping the extension, and wait a specified time for it to respond.
// If we don't hear back, emit an error.
ExtensionEventProxy.prototype.waitForExtension = function(timeout) {
  this.waitInterval = setInterval(function() {
    window.top.dispatchEvent(new window.CustomEvent(types.EXTENSION_IS_READY));
  }, 200);

  var proxy = this;

  this.waitTimeout = setTimeout(function() {
    if (!proxy.waitingForExtension) {
      return;
    }
    proxy.waitingForExtension = false;

    clearInterval(proxy.waitInterval);

    var error = new Error('Timeout waiting for extension.');
    proxy.emit('error', error);
  }, timeout);

  // Once the extension is listening, clear the timeout and interval, and send
  // queued messages.
  window.top.addEventListener(types.EXTENSION_READY, function() {
    if (!proxy.waitingForExtension) {
      return;
    }
    proxy.waitingForExtension = false;
    clearInterval(proxy.waitInterval);
    clearTimeout(proxy.waitTimeout);

    proxy.queuedMessages.forEach(function(msg) {
      proxy.send(msg.type, msg.body);
    });
    proxy.queuedMessages = [];

    proxy.emit('connected');
  });
};

module.exports = new ExtensionEventProxy();
module.exports.ctor = ExtensionEventProxy;
