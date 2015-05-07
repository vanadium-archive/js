// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var domready = require('domready');
var url = require('url');

var params = url.parse(document.URL, true).query;

domready(function() {
  document.getElementById('submit-caveats').addEventListener('click',
    function() {
      sendCaveats(false);
    });
  var originElems = document.getElementsByClassName('origin');
  for (var i = 0; i < originElems.length; i++) {
    originElems[i].innerText = params.origin;
  }
  // If the origin is not https, display a warning to the user.
  if (params.origin.indexOf('https') !== 0) {
    document.getElementById('warning').classList.remove('hidden');
  }

  // Setup the cancel button.
  document.getElementById('cancel').addEventListener('click', function() {
    sendCaveats(true);
  });

  if (process.env.TEST_CAVEATS) {
    // Set the value of the expiry caveat and submit the form.
    document.getElementById('ExpiryCaveat').value = process.env.TEST_CAVEATS;
    sendCaveats();
  }
});

// We only currently support Expiry because other caveats don't make sense to
// the end user and Revocation is not yet supported in WSPR.
var caveatNames = ['ExpiryCaveat'];

function sendCaveats(cancel) {
  var caveats = [];
  for (var i = 0; i < caveatNames.length; i++) {
    var caveatArgs = document.getElementById(caveatNames[i]).value;
    if (caveatNames[i] === 'ExpiryCaveat' && !caveatArgs) {
      caveats.push({
        type: 'ExpiryCaveat',
        args: '240h'
      });
    } else if (caveatArgs) {
      caveats.push({
        type: caveatNames[i],
        args: caveatArgs
      });
    }
  }
  var backgroundPort = chrome.runtime.connect();
  backgroundPort.postMessage({
    type: 'assocAccount:finish',
    requestId: parseInt(params.requestId),
    origin: params.origin,
    caveats: caveats,
    authState: params.authState,
    cancel: cancel
  });
  backgroundPort.disconnect();
}
