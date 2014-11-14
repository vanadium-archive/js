var debug = require('debug')('content-script:index');

var pageEventProxy = require('../../../src/proxy/event_proxy').Page();

// Port to communicate with background js.
var backgroundPort = chrome.runtime.connect();

// Forward messages from the webApp to the background page.
pageEventProxy.onAny(function(body) {
  // 'this' is bound to event emitter2 instance, which sets 'this.event' to the
  // type of the event.
  var type = this.event;
  debug('content script received message of type', type, 'from page:', body);
  backgroundPort.postMessage({
    type: this.event,
    body: body
  });
});

// Forward any messages from the background page to the webApp.
backgroundPort.onMessage.addListener(function(msg) {
  debug('content script received message of type', msg.type,
    'from page:', msg.body);
  pageEventProxy.send(msg.type, msg.body);
});

debug('content script loaded');
