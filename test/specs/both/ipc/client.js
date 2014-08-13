/**
 * @fileoverview Tests for client side binding.
 */
'use strict';

var Client = require('../../../../src/ipc/client.js');

describe('Client-side binding', function() {
  // Mock a proxy
  var mockedProxy = {
    nextId: function() { return 0; },
    sendRequest: function(data, type, handler, id) {
      var msg = JSON.parse(data);
      expect(msg.isStreaming).to.be.false;
      handler.handleResponse(0, {
        methodName: msg.method,
        args: msg.inArgs
      });
    },
    dequeue: function() {}
  };

  var mockedClient = new Client(mockedProxy);

  it('Binding to empty service', function(done) {
    var emptyServiceSignature = {};
    var testServicePromise = mockedClient.bindTo(
        'myService/TestService',
        emptyServiceSignature);

    testServicePromise.then(function(service) {
      // 1 for signature method which is always available
      expect(Object.keys(service)).to.have.length(1);
      done();
    }).catch (done);

  });

  describe('Executing bound functions', function() {
    var testService;
    var testServiceSignature;
    beforeEach(function(done) {
      testServiceSignature = {
        testMethod: {
          inArgs: ['a', 'b', 'c'],
          numOutArgs: 2
        },
        testMethod2: {
          inArgs: ['a'],
          numOutArgs: 2
        }
      };
      var testServicePromise = mockedClient.bindTo(
          'myService/TestService',
          testServiceSignature);

      testServicePromise.then(function(service) {
        // 1 for signature method which is always available
        expect(Object.keys(service)).to.have.length(2 + 1);
        testService = service;
        done();
      }).catch (done);

    });

    describe('testMethod', function() {
      it('Should succeed with correct number of arguments', function(done) {
        var result = testService.testMethod(3, 'X', null);
        result.then(function(result) {
          expect(result.methodName).to.equal('testMethod');
          expect(result.args).to.eql([3, 'X', null]);
          done();
        }).catch(done);
      });

      it('Should throw an error with wrong number of arguments', function() {
        expect(function() {
          testService.testMethod(3, 'X');
        }).to.throw(Error);
      });
    });

    describe('testMethod2', function() {
      it('Should succeed with correct number of arguments', function(done) {
        var result = testService.testMethod2(1);
        result.then(function(result) {
          expect(result.methodName).to.equal('testMethod2');
          expect(result.args).to.eql([1]);
          done();
        }).catch(done);
      });

      it('Should throw an error with wrong number of arguments', function() {
        expect(function() {
          testService.testMethod2(1, 'X', 'Y');
        }).to.throw(Error);
      });
    });

    describe('signature', function() {
      it('Should exist on the bound object', function() {
        expect(testService.signature).to.exist;
      });

      it('Should return the signature object', function() {
        var result = testService.signature();
        return expect(result).to.eventually.deep.equal(testServiceSignature);
      });
    });
  });
});
