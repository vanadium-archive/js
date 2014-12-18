var EE = require('eventemitter2').EventEmitter2;
var inherits = require('util').inherits;

var types = require('./event-proxy-message-types');

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
  window.top.addEventListener(types.TO_PAGE, function(ev) {
    proxy.emit(ev.detail.type, ev.detail.body);
  });

  this.waitingForExtension = true;

  // Queue of messages to send once we know the extension event proxy is
  // listening.
  this.queuedMessages = [];

  // Check to see if the extension is installed.
  this.isExtensionInstalled(function(isInstalled) {
    // If not installed, emit an error.
    if (!isInstalled) {
      // TODO(nlacasse): Fix this URL once the extension is hosted in the play
      // store.
      var error = new Error(
        'Error connecting to the Vanadium Chrome Extension.  Please make ' +
        'sure the extension is installed and enabled.  Download it here: ' +
        'https://github.com/veyron/veyron.js/raw/master/extension/veyron.crx'
      );
      proxy.emit('error', error);
      return;
    }

    // Otherwise, wait until the extension has loaded and is responding to
    // messages.
    proxy.waitForExtension(timeout);
  });
}
inherits(ExtensionEventProxy, EE);

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

// Check if the extension is installed by making a request to a web accessible
// image.  See http://stackoverflow.com/questions/8042548
ExtensionEventProxy.prototype.isExtensionInstalled = function(cb) {
  // TODO(nlacasse): Update this extensionId once we are hosted in the web
  // store.
  var extensionId = 'geagjbjjbbamldjlcbpabgdpeopikgne';
  var imgUrl = 'chrome-extension://' + extensionId + '/images/1x1.png';

  var img = window.document.createElement('img');
  img.setAttribute('src', imgUrl);

  img.addEventListener('load', cb.bind(null, true), true);
  img.addEventListener('error', cb.bind(null, false), true);
};

module.exports = new ExtensionEventProxy();
module.exports.ctor = ExtensionEventProxy;
