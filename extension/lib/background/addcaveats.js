var domready = require('domready');
var url = require('url');

var params = url.parse(document.URL, true).query;

domready(function() {
  document.getElementById('submit-caveats').addEventListener('click',
    sendCaveats);
  document.getElementById('header').innerText =
    'Select caveat on the blessing for webapp: ' + params.origin;
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
  backgroundPort = chrome.runtime.connect();
  backgroundPort.postMessage({
    type: 'assocAccount:finish',
    webappId: parseInt(params.webappId),
    origin: params.origin,
    caveats: caveats,
    authState: params.authState
  });
  backgroundPort.disconnect();
}
