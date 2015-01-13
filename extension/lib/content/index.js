var debug = require('debug')('content-script:index');
var random = require('../../../src/lib/random');
var pageEventProxy = require('./event-proxy');

// Port to communicate with background js.
var backgroundPort = chrome.runtime.connect();

// We generate and send different instanceIds to the background page than those
// coming from the web app. This prevents the web app from intentionally
// colliding with instanceIds from apps on other tabs. The two maps below are
// used to map between the two instanceIds.
var backgroundToPage = {};
var pageToBackground = {};

// If the plug-in crashed, the state of the connected Vanadium instances
// are invalid. We will block any further messages.
var invalidated = false;

// Forward messages from the webApp to the background page.
pageEventProxy.onAny(function(body) {
  if (invalidated && !process.env.ALLOW_INTENTIONAL_CRASH) {
    pageEventProxy.send('error', 'Refusing to send Vanadium message. ' +
      'Plug-in crashed and page must be reloaded.');
    return;
  }

  // 'this' is bound to event emitter2 instance, which sets 'this.event' to the
  // type of the event.
  var type = this.event;
  debug('content script received message of type', type, 'from page:', body);

  // Swap the instanceId with a generated one.
  if (body && body.instanceId) {
    var outgoingInstanceId = pageToBackground[body.instanceId] ||
        random.int32();
    pageToBackground[body.instanceId] = outgoingInstanceId;
    backgroundToPage[outgoingInstanceId] = body.instanceId;
    body.instanceId = outgoingInstanceId;
  }

  try {
    backgroundPort.postMessage({
      type: this.event,
      body: body
    });
  } catch (err) {
    pageEventProxy.send('error', 'Error posting message, ' +
          'you may need to reload this tab. ' + err);
  }
});

// Forward any messages from the background page to the webApp.
backgroundPort.onMessage.addListener(function(msg) {
  debug('content script received message of type', msg.type,
    'from background script:', msg.body);

  if (msg.type === 'crash') {
    // Block any future messages, as we don't currently have a way to
    // be sure the response will be correct.
    invalidated = true;

    // TODO(bprosnitz) We may want to send the event to the page, or even
    // find a way to restart the libraries automatically. Hopefully this
    // doesn't happen frequently enough to make it worthwhile to do this.
    pageEventProxy.send('error', 'Vanadium plug-in crashed. ' +
      'It is be necessary to reload this page for Vanadium to continue ' +
      'to fully function.');

    return;
  }

  // Swap the instanceId with the original one.
  if (msg.instanceId) {
    msg.instanceId = backgroundToPage[msg.instanceId];
  }

  pageEventProxy.send(msg.type, msg);
});

debug('content script loaded');
