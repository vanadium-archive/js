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
describe('server/signature_js_server.js: ' +
  'Signature, when service is in JS getServiceSignature', function() {

  var expectedSignature = {
    get: {
      inArgs: ['key'],
      numOutArgs: 2,
      isStreaming: false
    },
    set: {
      inArgs: ['key', 'value'],
      numOutArgs: 2,
      isStreaming: false
    },
    multiGet: {
      inArgs: [],
      numOutArgs: 2,
      isStreaming: true
    }
  };

  var signature;
  beforeEach(function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var cache = {
      set: function(key, value) {},
      get: function(key) {},
      multiGet: function($stream) {}
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
        expect(methodInfo.inArgs).to.exists;
        expect(methodInfo.inArgs.length).to.equal(
          expectedSignature[methodName].inArgs.length);
      }
    }
  });

  it('Should be able to get name of in params for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.inArgs).to.exists;
        for(var i=0; i < methodInfo.inArgs.length; i++) {
          expect(methodInfo.inArgs[i]).to.equal(
            expectedSignature[methodName].inArgs[i]);
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
        expect(methodInfo.numOutArgs).to.exists;
        expect(methodInfo.numOutArgs).to.equal(
          expectedSignature[methodName].numOutArgs);
      }
    }
  });

  it('Should be able to tell if streaming for each method', function() {
    expect(Object.keys(signature)).to.have.length(3);

    for (var methodName in signature) {
      if(signature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.isStreaming).to.exists;
        expect(methodInfo.isStreaming).to.equal(
          expectedSignature[methodName].isStreaming);
      }
    }
  });
});
