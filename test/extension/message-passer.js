// Shuffle messages between the top frame and the test iframe where our tests
// run. This allows the content script to send messages to veyron.js by posting
// to the top window.

// TODO(nlacasse): Only shuffle messages that Veyron cares about, not Prova
// messages (although shuffling Prova messages doesn't seem to cause any
// problems).

window.top.addEventListener('message', function(ev) {
  window.postMessage(ev.data, '*');
}, false);
