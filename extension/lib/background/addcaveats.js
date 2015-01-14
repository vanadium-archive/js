var domready = require('domready');
var url = require('url');

var params = url.parse(document.URL, true).query;

// TODO(nlacasse, suharshs): Bring this page up-to-date with the functionality
// of the add-caveats page on the identity server.  At the very least, we need
// to not allow users to submit the form without entering a caveat.

domready(function() {
  document.getElementById('submit-caveats').addEventListener('click',
    sendCaveats);
  document.getElementById('header').innerText =
    'Select caveat on the blessing for webapp: ' + params.origin;

  if (process.env.TEST_CAVEATS) {
    // Set the value of the exipry caveat and submit the form.
    document.getElementById('ExpiryCaveat').value = process.env.TEST_CAVEATS;
    sendCaveats();
  }
});

var caveatNames = ['ExpiryCaveat', 'MethodCaveat'];

function sendCaveats() {
  var caveats = [];
  for (var i = 0; i < caveatNames.length; i++) {
    var caveatArgs = document.getElementById(caveatNames[i]).value;
    if (caveatArgs) {
      caveats.push({
        type: caveatNames[i],
        args: caveatArgs
      });
    }
  }
  var backgroundPort = chrome.runtime.connect();
  backgroundPort.postMessage({
    type: 'assocAccount:finish',
    webappId: parseInt(params.webappId),
    origin: params.origin,
    caveats: caveats,
    authState: params.authState
  });
  backgroundPort.disconnect();
}
