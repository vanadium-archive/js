// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var EE = require('eventemitter2').EventEmitter2;
var inherits = require('inherits');

var types = require('../../../src/browser/event-proxy-message-types');

// PageEventProxy sends messages to the web page, and listens for messages
// coming from the web page.
// Note: We need to be careful to not expose the messages to iframes of
// different origins. dispatchEvent is used instead of postMessage to origin '*'
// because it isolates message to the sender's origin.
// Tests showing this: https://gist.github.com/bprosnitz/89db637b2e798ce05a6a
function PageEventProxy(){
  if (!(this instanceof PageEventProxy)) {
    return new PageEventProxy();
  }
  EE.call(this);
  var proxy = this;
  window.addEventListener(types.TO_EXTENSION, function(ev) {
    proxy.emit(ev.detail.type, ev.detail.body);
  });

  // Respond to "is_ready" events with "ready" events.
  window.addEventListener(types.EXTENSION_IS_READY, function() {
    window.dispatchEvent(new CustomEvent(types.EXTENSION_READY));
  });
}
inherits(PageEventProxy, EE);

PageEventProxy.prototype.send = function(type, body) {
  window.dispatchEvent(
    new window.CustomEvent(types.TO_PAGE, {
      detail: {
        type: type,
        body: body
      }
    })
  );
};

module.exports = new PageEventProxy();
