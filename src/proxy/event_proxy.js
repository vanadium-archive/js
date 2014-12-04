var EE = require('eventemitter2').EventEmitter2;
var inherits = require('util').inherits;

var types = require('./event_proxy_message_types');

module.exports = ExtensionEventProxy;

// ExtensionEventProxy sends messages to the extension, and listens for messages
// coming from the extension.
function ExtensionEventProxy(){
  if (!(this instanceof ExtensionEventProxy)) {
    return new ExtensionEventProxy();
  }
  EE.call(this);
  var that = this;
  window.top.addEventListener(types.TO_PAGE, function(ev) {
    that.emit(ev.detail.type, ev.detail.body);
  });
}
inherits(ExtensionEventProxy, EE);

ExtensionEventProxy.prototype.send = function(type, body) {
  window.top.dispatchEvent(
    new window.CustomEvent(types.TO_EXTENSION, {
      detail: {
        type: type,
        body: body
      }
    })
  );
};
