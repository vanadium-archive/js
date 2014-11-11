var EE = require('eventemitter2').EventEmitter2;
var inherits = require('util').inherits;

module.exports = {
  Extension: ExtensionEventProxy,
  Page: PageEventProxy
};

var TO_EXTENSION = 'vanadiumMessageToExtension';
var TO_PAGE = 'vanadiumMessageToPage';

// ExtensionEventProxy sends messages to the extension, and listens for messages
// coming from the extension.
function ExtensionEventProxy(){
  if (!(this instanceof ExtensionEventProxy)) {
    return new ExtensionEventProxy();
  }
  EE.call(this);
  var that = this;
  window.top.addEventListener(TO_PAGE, function(ev) {
    that.emit(ev.detail.type, ev.detail.body);
  });
}
inherits(ExtensionEventProxy, EE);

ExtensionEventProxy.prototype.send = function(type, body) {
  window.top.dispatchEvent(
    new window.CustomEvent(TO_EXTENSION, {
      detail: {
        type: type,
        body: body
      }
    })
  );
};

// PageEventProxy sends messages to the web page, and listens for messages
// coming from the web page.
function PageEventProxy(){
  if (!(this instanceof PageEventProxy)) {
    return new PageEventProxy();
  }
  EE.call(this);
  var that = this;
  window.top.addEventListener(TO_EXTENSION, function(ev) {
    that.emit(ev.detail.type, ev.detail.body);
  });
}
inherits(PageEventProxy, EE);

PageEventProxy.prototype.send = function(type, body) {
  window.top.dispatchEvent(
    new window.CustomEvent(TO_PAGE, {
      detail: {
        type: type,
        body: body
      }
    })
  );
};
