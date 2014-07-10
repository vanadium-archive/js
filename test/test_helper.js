/**
 * @fileoverview common helper functions to quicker testing setup
 */

'use strict';

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
TestHelper.serveAndBindService = function(service, name,
    metadata) {
  var veyron = new Veyron(TestHelper.veyronConfig);
  var server = veyron.newServer();
  var servingName = 'integration/tests/' + name;
  return server.serve(servingName, service, metadata).then(function() {
    var client = veyron.newClient();
    return client.bindTo(servingName);
  }).then(function(s) {
    return s;
  });

};

if (global) {
  global.TestHelper = TestHelper;
}
