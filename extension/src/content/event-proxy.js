// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var EE = require('eventemitter2').EventEmitter2;
var inherits = require('inherits');

var types = require('../../../src/browser/event-proxy-message-types');

// PageEventProxy sends messages to the web page, and listens for messages
// coming from the web page.
function PageEventProxy(){
  if (!(this instanceof PageEventProxy)) {
    return new PageEventProxy();
  }
  EE.call(this);
  var proxy = this;
  window.top.addEventListener(types.TO_EXTENSION, function(ev) {
    proxy.emit(ev.detail.type, ev.detail.body);
  });

  // Respond to "is_ready" events with "ready" events.
  window.top.addEventListener(types.EXTENSION_IS_READY, function() {
    window.top.dispatchEvent(new CustomEvent(types.EXTENSION_READY));
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

module.exports = new PageEventProxy();
