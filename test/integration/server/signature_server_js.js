/**
 * @fileoverview Integration test for Veyron Client's auto signature discovery
 * This module tests that a veyron JS client find the method signature of a
 * remote server which is in JavaScript and therefore does not require an
 * IDL for binding.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public 'veyron' module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */
describe.skip('When service in JS, client\'s GetServiceSignature', function() {

  var expectedSignature = {
    'Get': {
      numParams: 1,
      numReturnArgs: 1,
      isStreaming: 0
    },
    'Set': {
      numParams: 2,
      numReturnArgs: 0,
      isStreaming: 0
    },
    'MultiGet': {
      numParams: 0,
      numReturnArgs: 0,
      isStreaming: 1
    }
  };

  var signature;
  beforeEach(function(done) {

    var veyronConfig = {
      'proxy': testconfig['HTTP_PROXY_SERVER_URL'],
      logLevel: Veyron.logLevels.INFO
    };

    var veyron = new Veyron(veyronConfig);
    var cache = {
      Set: function(key, value) {},
      Get: function(key) {},
      MultiGet: function($stream) {}
    };

    // Create server object and publish the service
    var server = veyron.newServer();

    server.register('Cache', cache).then(function() {
      return server.publish('myCache');
    }).then(function(endpoint) {

      // Create a client and bind to it
      var client = veyron.newClient();

      client._getServiceSignature('myCache/Cache').then(function(sig) {
        signature = sig;
        done();
      }).catch (done);

    });

  });

  it('Should be able to get the signature from remote service', function() {
    expect(signature).to.exist;
  });

  it('Should be able to get all method names', function() {
    expect(signature).to.include.keys(Object.Keys(expectedSignature));
  });

  it('Should be able to get number of in params for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo.numParams).to.equal(
          expectedSignature[methodName].numParams);
      }
    }
  });

  it('Should be able to get number of out params for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo.numReturnArgs).to.equal(
          expectedSignature[methodName].numReturnArgs);
      }
    }
  });

  it('Should be able to tell if streaming for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo.isStreaming).to.equal(
          expectedSignature[methodName].isStreaming);
      }
    }
  });

});
