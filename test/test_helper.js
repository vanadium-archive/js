/**
 * @fileoverview common helper functions to quicker testing setup
 */
var veyron = require('../src/veyron');

// Our JSHint config marks TestHelper as a read-only global, but this is the
// file where we initialize TestHelper, so here we allow writes.
/* global TestHelper: true */
var TestHelper = {};

// Default veyron config for integration tests
TestHelper.veyronConfig = {
  proxy: testconfig['WSPR_SERVER_URL'],
  identityServer: testconfig['IDENTITY_SERVER_URL'],
  logLevel: testconfig['LOG_LEVEL']
};

/*
 * Helper that servees a service, binds to it and returns the bound service
 */
TestHelper.serveAndBindService = function(service, name, metadata) {
  return veyron.init(TestHelper.veyronConfig).then(function(rt){
    var servingName = 'integration/tests/' + name;
    return rt.serve(servingName, service, metadata).then(function() {
      return rt.bindTo(servingName);
    }).then(function(s) {
      return s;
    });
  });
};

/*
 * Add a mock of the veyron extension.  This will only affect the browser tests.
 * It responds to auth requests with a fake identity name.
 */
function installMockVeyronExtension() {
  var isBrowser = (typeof window === 'object');
  if (!isBrowser) {
    return;
  }

  var Postie = require('postie');
  var webApp = new Postie(window);

  function handleAuthRequest() {
    process.nextTick(function(){
      webApp.post('auth:success', {name: '/veyron/mock/identity'});
    });
  }

  webApp.on('auth', handleAuthRequest);
}

// TODO(nlacasse): find a better place for this.
installMockVeyronExtension();


module.exports = TestHelper;
