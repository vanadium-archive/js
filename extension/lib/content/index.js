// TODO(nlacasse): Consider dropping the requirement on Postie, as it has a
// rather large footprint, and could maybe be replaced with something simpler.
var Postie = require('postie');
var webAppPort = new Postie(window);
var debug = require('debug')('content-script:index');
if (typeof window !== 'undefined') {
  window.debug = require('debug');
}

// Port to communicate with background js.
var backgroundPort = chrome.runtime.connect();

// TODO(nlacasse): Unify the message-passing.  Postie using event-listener
// syntax, chrome runtime uses postMessage.  One takes strings while the other
// takes objects.

// Forward any auth request to the background js.
webAppPort.on('auth', function(){
  debug('auth request received');
  webAppPort.post('auth:received');
  backgroundPort.postMessage({ type: 'auth' });
});

// Forward any messages from the backgrounp js to the webApp.
backgroundPort.onMessage.addListener(function(msg){
  debug('content script received message from background.', msg);
  webAppPort.post(msg.type, msg);
});

debug('content script loaded');

