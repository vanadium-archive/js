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
        'testMethod': {
          inArgs: ['a', 'b', 'c'],
          numOutArgs: 2
        },
        'testMethod2': {
          inArgs: ['a'],
          numOutArgs: 2
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

    describe('testMethod', function() {
      it('Should succeed with correct number of arguments', function() {
        var result = testService.testMethod(3, 'X', null);
        expect(result.methodName).to.equal('testMethod');
        expect(result.args).to.eql([3, 'X', null]);
      });

      it('Should throw an error with wrong number of arguments', function() {
        expect(function() {
          testService.testMethod(3, 'X');
        }).to.throw(Error);
      });
    });

    describe('testMethod2', function() {
      it('Should succeed with correct number of arguments', function() {
        var result = testService.testMethod2(1);
        expect(result.methodName).to.equal('testMethod2');
        expect(result.args).to.eql([1]);
      });

      it('Should throw an error with wrong number of arguments', function() {
        expect(function() {
          testService.testMethod2(1, 'X', 'Y');
        }).to.throw(Error);
      });
    });

  });
});
