// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vanadium = window.vanadium = require('../../src/vanadium.js');

var vanadiumConfig = {
  authenticate: true
};

document.addEventListener('DOMContentLoaded', function(){
  var loginLink = document.getElementById('login-link');
  loginLink.addEventListener('click', handleLogin);

  console.log('example app loaded');
});

function handleLogin(e){
  e.preventDefault();
  console.log('login clicked');

  vanadium.init(vanadiumConfig, function(err, rt){
    if (err) {
      return console.error(err);
    }

    var accountName = rt.accountName;
    console.log('got runtime with accountName: ' + accountName);
    alert('Hello ' + accountName + '!');
  });
}
