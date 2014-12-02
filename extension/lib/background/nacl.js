var domready = require('domready');
var EE = require('events').EventEmitter;
var inherits = require('util').inherits;

var state = require('../state');

module.exports = Nacl;

function Nacl() {
  if (!(this instanceof Nacl)) {
    return new Nacl();
  }

  EE.call(this);

  this.queuedMessages = [];

  // Send start message on load.
  this.once('load', this._start.bind(this));

  // Send queued messages once browspr is started.
  this.once('browsprStarted', this._sendQueuedMessages.bind(this));

  // Wait until the dom is ready, then add 'load' and 'message' listeners on the
  // nacl plugin that will trigger events on this object.
  var nacl = this;
  domready(function(){
    nacl.naclElt = document.getElementById('nacl');
    // 'load' listener must have useCapture argument set to 'true'.
    nacl.naclElt.addEventListener('load', nacl.emit.bind(nacl, 'load'), true);
    nacl.naclElt.addEventListener('message', nacl.emit.bind(nacl, 'message'));
  });
}

inherits(Nacl, EE);

// Send message from content script to Nacl.
Nacl.prototype.sendMessage = function(msg) {
  if (!this.naclElt) {
    this.queuedMessages.push(msg);
    return;
  }
  this.naclElt.postMessage(msg);
};

Nacl.prototype._start = function() {
  var settings = state.settings();
  console.log(settings);

  // Emit 'browsprStarted' event on the first 'browsprStarted' message.
  var nacl = this;
  this.on('message', function handleMsg(msg) {
    if (msg.data && msg.data.type === 'browsprStarted') {
      console.log('Browspr Started');
      nacl.emit('browsprStarted');
      nacl.removeListener('message', handleMsg);
    }
  });

  // Send the start message to Nacl.
  this.sendMessage({
    // -1 indicates the request is from background page
    instanceId: -1,
    type: 'browsprStart',
    body: {
      // TODO(nlacasse): Make sure that these settings have had time to load
      // from localStorage.
      identityd: settings.identityd.value,
      namespaceRoot: settings.namespaceRoot.value,
      proxy: settings.proxy.value,

      // TODO(nlacasse,bprosnitz): Browspr should get these values from
      // localStorage or TPM. For now the defaultBlessingName is hard-coded to
      // make the authorizer tests pass.
      defaultBlessingName: 'test/child',
      pemPrivateKey: [
        '-----BEGIN EC PRIVATE KEY-----',
        'MHcCAQEEIIJ7zF8sTpNT5r5j8yvvD8tofAwIMKEFHfXTMoapZQGOoAoGCCqGSM49',
        'AwEHoUQDQgAECsdd8fIh0s3xHlWOLrtc/l8vX/ZwS0rkb0rGbjL76yhbxZY+6muL',
        '4Ss3dGUK87CNHee+8HiHrl6VVR+SrLOXqg==',
          '-----END EC PRIVATE KEY-----'].join('\n')
    }
  });
};

Nacl.prototype._sendQueuedMessages = function() {
  var nacl = this;
  this.queuedMessages.forEach(function(msg) {
    nacl.naclElt.postMessage(msg);
  });
  this.queuedMessages = [];
  console.log('Sent queued messages');
};
