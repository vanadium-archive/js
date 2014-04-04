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
describe('Signature, when service is in JS getServiceSignature', function() {

  var expectedSignature = {
    'Get': {
      InArgs: ['key'],
      NumOutArgs: 1,
      IsStreaming: false
    },
    'Set': {
      InArgs: ['key', 'value'],
      NumOutArgs: 1,
      IsStreaming: false
    },
    'MultiGet': {
      InArgs: [],
      NumOutArgs: 1,
      IsStreaming: true
    }
  };

  var signature;
  beforeEach(function(done) {

    var veyronConfig = {
      'proxy': testconfig['HTTP_PROXY_SERVER_URL'],
      'identityServer': testconfig['IDENTITY_SERVER_URL'],
      'logLevel': testconfig['LOG_LEVEL']
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

      client._proxyConnection.getServiceSignature('myCache/Cache')
      .then(function(sig) {
        signature = sig;
        done();
      }).catch (done);

    });

  });

  it('Should be able to get the signature from remote service', function() {
    expect(signature).to.exist;
  });

  it('Should be able to get all method names', function() {
    expect(signature).to.include.keys(Object.keys(expectedSignature));
  });

  it('Should be able to get number of in params for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.InArgs).to.exists;
        expect(methodInfo.InArgs.length).to.equal(
          expectedSignature[methodName].InArgs.length);
      }
    }
  });

  it('Should be able to get name of in params for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.InArgs).to.exists;
        for(var i=0; i < methodInfo.InArgs.length; i++) {
          expect(methodInfo.InArgs[i]).to.equal(
            expectedSignature[methodName].InArgs[i]);
        }
      }
    }
  });

  it('Should be able to get number of out params for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.NumOutArgs).to.exists;
        expect(methodInfo.NumOutArgs).to.equal(
          expectedSignature[methodName].NumOutArgs);
      }
    }
  });

  it('Should be able to tell if streaming for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.IsStreaming).to.exists;
        expect(methodInfo.IsStreaming).to.equal(
          expectedSignature[methodName].IsStreaming);
      }
    }
  });

});
