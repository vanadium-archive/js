var domready = require('domready');
var EE = require('events').EventEmitter;
var inherits = require('util').inherits;

module.exports = Nacl;

function Nacl() {
  if (!(this instanceof Nacl)) {
    return new Nacl();
  }

  EE.call(this);

  this.queuedMessages = [];

  // Send queued messages on load.
  this.once('load', this._sendQueuedMessages.bind(this));

  // Wait until the dom is ready, then add 'load' and 'message' listeners on the
  // nacl plugin that will trigger events on this object.
  var that = this;
  domready(function(){
    that.nacl = document.getElementById('nacl');
    // 'load' listener must have useCapture argument set to 'true'.
    that.nacl.addEventListener('load', that.emit.bind(that, 'load'), true);
    that.nacl.addEventListener('message', that.emit.bind(that, 'message'));
  });
}

inherits(Nacl, EE);

// Send message from content script to Nacl.
Nacl.prototype.sendMessage = function(msg) {
  if (!this.nacl) {
    this.queuedMessages.push(msg);
    return;
  }
  this.nacl.postMessage(msg);
};

Nacl.prototype._sendQueuedMessages = function() {
  var that = this;
  this.queuedMessages.forEach(function(msg) {
    that.nacl.postMessage(msg);
  });
  this.queuedMessages = [];
};
