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
      NumOutArgs: 2,
      IsStreaming: false
    },
    'set': {
      InArgs: ['key', 'value'],
      NumOutArgs: 1,
      IsStreaming: false
    },
    'multiGet': {
      InArgs: [],
      NumOutArgs: 1,
      IsStreaming: true
    }
  };

  var signature;
  beforeEach(function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';

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

  it('Should use a valid cache entry', function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';
    client._proxyConnection.bindCache[absoluteVeyronName] = {
      fetched: new Date(),
      signature: {
        'bar': 'foo'
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
        'bar': 'foo'
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
