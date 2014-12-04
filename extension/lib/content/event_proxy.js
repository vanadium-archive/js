var EE = require('eventemitter2').EventEmitter2;
var inherits = require('util').inherits;

var types = require('../../../src/proxy/event_proxy_message_types');

module.exports = PageEventProxy;

// PageEventProxy sends messages to the web page, and listens for messages
// coming from the web page.
function PageEventProxy(){
  if (!(this instanceof PageEventProxy)) {
    return new PageEventProxy();
  }
  EE.call(this);
  var that = this;
  window.top.addEventListener(types.TO_EXTENSION, function(ev) {
    that.emit(ev.detail.type, ev.detail.body);
  });
}
inherits(PageEventProxy, EE);

PageEventProxy.prototype.send = function(type, body) {
  window.top.dispatchEvent(
    new window.CustomEvent(types.TO_PAGE, {
      detail: {
        type: type,
        body: body
      }
    })
  );
};
