var veyron = require('../../src/veyron.js');
var extensionProxy = require('../../src/proxy/event_proxy')();

// TODO(nlacasse): Consider getting this url from the extension?  Might not be
// worth it though, because soon WSPR will be included in the extension and
// won't need any url.
var veyronConfig = {
  authenticate: true,
  proxy: 'http://localhost:8124'
};

document.addEventListener('DOMContentLoaded', function(){
  var loginLink = document.getElementById('login-link');
  loginLink.addEventListener('click', handleLogin);

  var naclLink = document.getElementById('nacl-link');
  naclLink.addEventListener('click', handleNacl);

  console.log('example app loaded');
});

function handleLogin(e){
  e.preventDefault();
  console.log('login clicked');

  veyron.init(veyronConfig, function(err, rt){
    if (err) {
      return console.error(err);
    }

    var accountName = rt.accountName;
    console.log('got runtime with accountName: ' + accountName);
    alert('Hello ' + accountName + '!');
  });
}

function handleNacl(e) {
  e.preventDefault();
  console.log('nacl clicked');
  extensionProxy.send('nacl', {
    method: 'reverse',
    arg: 'testing123'
  });

  extensionProxy.once('nacl', function(msg) {
    console.log(msg);
  });
}
