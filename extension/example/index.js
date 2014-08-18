var veyron = require('veyron');

// TODO(nlacasse): Consider getting this url from the extension?  Might not be
// worth it though, because soon WSPR will be included in the extension and
// won't need any url.
var veyronConfig = { 'proxy': 'http://localhost:8124' };

document.addEventListener('DOMContentLoaded', function(){
  var loginLink = document.getElementById('login-link');
  loginLink.addEventListener('click', handleLogin);
  console.log('example app loaded');
});

function handleLogin(e){
  e.preventDefault();
  console.log('login clicked');

  veyron.init(veyronConfig, function(err, rt){
    if (err) {
      return console.error(err);
    }

    var name = rt._options.identityName;
    console.log('got runtime with identity name: ' + name);
    alert('Hello, ' + name + '!');
  });
}
