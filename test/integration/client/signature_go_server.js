/**
 * @fileoverview Integration test for Veyron Client's auto signature discovery
 * This module tests that a veyron JS client finds the method signature of a
 * remote GO server and therefore does not require an IDL for binding.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public 'veyron' module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */
var Veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');
describe('client/signature_go_server.js: ' +
  'Signature, when service is in GO, getServiceSignature', function() {

  var expectedSignature = {
    get: {
      inArgs: ['key'],
      numOutArgs: 2,
      isStreaming: false
    },
    set: {
      inArgs: ['key', 'value'],
      numOutArgs: 1,
      isStreaming: false
    },
    multiGet: {
      inArgs: [],
      numOutArgs: 1,
      isStreaming: true
    }
  };

  var signature;
  beforeEach(function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';

    client.bindTo(absoluteVeyronName).then(function(serviceObject) {
      return serviceObject.signature();
    }).then(function(sig) {
      signature = sig;
      done();
    }).catch (done);

  });


  it('Should be able to get the signature from remote service', function() {
    expect(signature).to.exist;
  });

  it('Should be able to get all method names', function() {
    expect(signature).to.include.keys(Object.keys(expectedSignature));
  });

  it('Should be able to get number of in params for each method', function() {
    for (var methodName in expectedSignature) {
      if(expectedSignature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.inArgs).to.exists;
        expect(methodInfo.inArgs.length).to.equal(
          expectedSignature[methodName].inArgs.length);
      }
    }
  });

  it('Should be able to get name of in params for each method', function() {
    for (var methodName in expectedSignature) {
      if(expectedSignature.hasOwnProperty(methodName)) {
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
    for (var methodName in expectedSignature) {
      if(expectedSignature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.numOutArgs).to.exists;
        expect(methodInfo.numOutArgs).to.equal(
          expectedSignature[methodName].numOutArgs);
      }
    }
  });

  it('Should be able to tell if streaming for each method', function() {
    for (var methodName in expectedSignature) {
      if(expectedSignature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.isStreaming).to.exists;
        expect(methodInfo.isStreaming).to.equal(
          expectedSignature[methodName].isStreaming);
      }
    }
  });

  it('Should use a valid cache entry', function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';
    client._proxyConnection.bindCache[absoluteVeyronName] = {
      fetched: new Date(),
      signature: {
        bar: 'foo'
      }
    };
    client._proxyConnection.getServiceSignature(absoluteVeyronName)
    .then(function(sig) {
      expect(sig.bar).to.equal('foo');
      done();
    }).catch (done);
  });

  it('Should skip a stale cache entry', function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';
    client._proxyConnection.bindCache[absoluteVeyronName] = {
      // 3 hours ago.
      fetched: new Date() - 7200 * 1000,
      signature: {
        bar: 'foo'
      }
    };
    client._proxyConnection.getServiceSignature(absoluteVeyronName)
    .then(function(signature) {
      expect(signature.bar).to.not.exists;
      for (var methodName in expectedSignature) {
        if(expectedSignature.hasOwnProperty(methodName)) {
          var methodInfo = signature[methodName];
          expect(methodInfo).to.exists;
        }
      }
      done();
    }).catch (done);
  });

  it('Should store a valid cache entry', function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';
    client._proxyConnection.getServiceSignature(absoluteVeyronName)
    .then(function() {
      var entry = client._proxyConnection.bindCache[absoluteVeyronName];
      var signature = entry.signature;
      // Expect the timestamp to be recent.
      expect(new Date() - entry.fetched).to.be.below(2000);
      for (var methodName in expectedSignature) {
        if(expectedSignature.hasOwnProperty(methodName)) {
          var methodInfo = signature[methodName];
          expect(methodInfo).to.exists;
        }
      }
      done();
    }).catch (done);
  });
});
