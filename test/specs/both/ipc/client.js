/**
 * @fileoverview Tests for client side binding.
 */
'use strict';

var Client = require('../../../../src/ipc/client.js');

describe('Client-side binding', function() {

  // Mock a proxy
  var mockedProxy = {
    promiseInvokeMethod: function(name, methodName, args, numOut,
        streaming) {
      expect(streaming).to.be.false;
      return {methodName: methodName, args: args};
    }
  };

  var mockedClient = new Client(mockedProxy);

  it('Binding to empty service', function(done) {
    var emptyServiceSignature = {};
    var testServicePromise = mockedClient.bind(
        'myService/TestService',
        emptyServiceSignature);

    testServicePromise.then(function(service) {
      expect(Object.keys(service)).to.have.length(0);
      done();
    }).catch (done);

  });

  describe('Executing bound functions', function() {
    var testService;
    beforeEach(function(done) {
      var testServiceSignature = {
        'TestMethod': {
          name: 'TestMethod',
          numParams: 3,
          numOutParams: 0
        },
        'TestMethod2': {
          name: 'TestMethod2',
          numParams: 1,
          numOutParams: 1
        }
      };
      var testServicePromise = mockedClient.bind(
          'myService/TestService',
          testServiceSignature);

      testServicePromise.then(function(service) {
        expect(Object.keys(service)).to.have.length(2);
        testService = service;
        done();
      }).catch (done);

    });

    describe('TestMethod', function() {
      it('Should succeed with correct number of arguments', function() {
        var result = testService.TestMethod(3, 'X', null);
        expect(result.methodName).to.equal('TestMethod');
        expect(result.args).to.eql([3, 'X', null]);
      });

      it('Should throw an error with wrong number of arguments', function() {
        expect(function() {
          testService.TestMethod(3, 'X');
        }).to.throw(Error);
      });
    });

    describe('TestMethod2', function() {
      it('Should succeed with correct number of arguments', function() {
        var result = testService.TestMethod2(1);
        expect(result.methodName).to.equal('TestMethod2');
        expect(result.args).to.eql([1]);
      });

      it('Should throw an error with wrong number of arguments', function() {
        expect(function() {
          testService.TestMethod2(1, 'X', 'Y');
        }).to.throw(Error);
      });
    });

  });
});
