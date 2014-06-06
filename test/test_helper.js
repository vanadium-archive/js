/**
 * @fileoverview common helper functions to quicker testing setup
 */

'use strict';

var TestHelper = {};

// Default veyron config for integration tests
TestHelper.veyronConfig = {
  'proxy': testconfig['WSPR_SERVER_URL'],
  'identityServer': testconfig['IDENTITY_SERVER_URL'],
  'logLevel': testconfig['LOG_LEVEL']
};

/*
 * Helper that publishes a service, binds to it and returns the bound service
 */
TestHelper.publishAndBindService = function(service, name) {
  var veyron = new Veyron(TestHelper.veyronConfig);
  var server = veyron.newServer();
  server.register(name, service);
  return server.publish('integration/tests/').then(function() {
    var client = veyron.newClient();
    return client.bindTo('integration/tests/' + name);
  }).then(function(s) {
    return s;
  });

};

if (global) {
  global.TestHelper = TestHelper;
}
