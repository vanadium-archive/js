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
'use strict';

describe('Signature, when service is in GO, getServiceSignature', function() {

  var expectedSignature = {
    'get': {
      InArgs: ['key'],
      NumOutArgs: 1,
      IsStreaming: false
    },
    'set': {
      InArgs: ['key', 'value'],
      NumOutArgs: 0,
      IsStreaming: false
    },
    'multiGet': {
      InArgs: [],
      NumOutArgs: 0,
      IsStreaming: true
    }
  };

  var signature;
  beforeEach(function(done) {

    var veyronConfig = {
      'proxy': testconfig['WSPR_SERVER_URL'],
      'identityServer': testconfig['IDENTITY_SERVER_URL'],
      'logLevel': testconfig['LOG_LEVEL']
    };

    var veyron = new Veyron(veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] +
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_NAME'];

    client._proxyConnection.getServiceSignature(absoluteVeyronName)
    .then(function(sig) {
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
        expect(methodInfo.InArgs).to.exists;
        expect(methodInfo.InArgs.length).to.equal(
          expectedSignature[methodName].InArgs.length);
      }
    }
  });

  it('Should be able to get name of in params for each method', function() {

    for (var methodName in expectedSignature) {
      if(expectedSignature.hasOwnProperty(methodName)) {
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

    for (var methodName in expectedSignature) {
      if(expectedSignature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.NumOutArgs).to.exists;
        expect(methodInfo.NumOutArgs).to.equal(
          expectedSignature[methodName].NumOutArgs);
      }
    }
  });

  it('Should be able to tell if streaming for each method', function() {

    for (var methodName in expectedSignature) {
      if(expectedSignature.hasOwnProperty(methodName)) {
        var methodInfo = signature[methodName];
        expect(methodInfo).to.exists;
        expect(methodInfo.IsStreaming).to.exists;
        expect(methodInfo.IsStreaming).to.equal(
          expectedSignature[methodName].IsStreaming);
      }
    }
  });

});
