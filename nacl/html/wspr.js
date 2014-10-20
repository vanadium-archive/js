// Use alarms to keep chrome from killing the extension.
function addAlarm() {
  chrome.alarms.create('keepWsprAwake', {
    when: Date.now() + 500
  });
}

chrome.alarms.onAlarm.addListener(addAlarm);
addAlarm();

// Callback when module is loaded.
function moduleDidLoad() {
  var wspr = window.document.getElementById('wspr');
  console.log('Using config: ' + JSON.stringify(window.config));
  wspr.postMessage({
    'type': 'start',
    'body': window.config
  });
}

var listener = window.document.getElementById('listener');
listener.addEventListener('load', moduleDidLoad, true);