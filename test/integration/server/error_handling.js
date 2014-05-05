/**
 * @fileoverview Integration test for error handling in JS Services
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */

describe('server/error_handling.js: Service in JS', function() {

  var errMessage = 'failure';
  var error = new Error(errMessage);
  var namedError = new Error(errMessage);
  namedError.name = 'MyError';
  var builtInError = new Veyron.Errors.NotFoundError('can\'t see it');

  var remoteService;
  before(function(done) {
    var service = {
      throwError: function() {
        throw error;
      },
      throwNamedError: function() {
        throw namedError;
      },
      throwString: function() {
        throw errMessage;
      },
      returnError: function() {
        return error;
      },
      returnErrorInCallback: function($callback) {
        $callback(error, null);
      },
      returnNamedError: function() {
        return namedError;
      },
      rejectPromise: function() {
        var def = new Veyron.Deferred();
        def.reject(error);
        return def.promise;
      },
      rejectPromiseWithString: function() {
        var def = new Veyron.Deferred();
        def.reject(errMessage);
        return def.promise;
      },
      returnCustomError: function() {
        function CustomError(message) {
          Error.call(this);
          this.name = 'CustomError';
          this.message = message;
          this.stack = (new Error()).stack;
        }
        CustomError.prototype = new Error();
        CustomError.prototype.constructor = CustomError;

        return new CustomError(errMessage);
      },
      returnBuiltInError: function() {
        return builtInError;
      }
    };

    TestHelper.publishAndBindService(service,'err-handling').then(function(s) {
      remoteService = s;
      done();
    }).catch(function(e) {
      done(e);
    });
  });

  it('Should be able to throw an Error object', function() {
    var call = remoteService.throwError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(error.message);
      expect(r.name).to.equal(error.name);
    });
  });

  it('Should be able to throw a string error', function() {
    var call = remoteService.throwString();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(error.message);
      expect(r.name).to.equal(error.name);
    });
  });

  it('Should be able to return an Error object', function() {
    var call = remoteService.returnError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(error.message);
      expect(r.name).to.equal(error.name);
    });
  });

  it('Should be able to return an Error object in Callback', function() {
    var call = remoteService.returnErrorInCallback();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(error.message);
      expect(r.name).to.equal(error.name);
    });
  });

  it('Should be able to indicate error by rejecting a promise', function() {
    var call = remoteService.rejectPromise();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(error.message);
      expect(r.name).to.equal(error.name);
    });
  });

  it('Should be able to reject a promise using string error', function() {
    var call = remoteService.rejectPromiseWithString();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(error.message);
      expect(r.name).to.equal(error.name);
    });
  });

  it('Should not send the stack trace to remote client', function() {
    var call = remoteService.throwError();
    return expect(call).to.eventually.be.rejectedWith(
      /^(.(?!at Object.service.ThrowError))*$/);
  });

  it('Should be able to set name of error in throwing', function() {
    var call = remoteService.throwNamedError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(namedError.message);
      expect(r.name).to.equal(namedError.name);
    });
  });

  it('Should be able to set name of error in returning', function() {
    var call = remoteService.throwNamedError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(namedError.message);
      expect(r.name).to.equal(namedError.name);
    });
  });

  it('Should be able to use built-in veyron errors', function() {
    var call = remoteService.returnBuiltInError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(builtInError.message);
      expect(r.name).to.equal(builtInError.name);
    });
  });

  it('Should be able to return a custom Error object', function() {
    // Note that we can not preserve the prototype inheritance of custom error
    var expectedError = new Error(errMessage);
    expectedError.name = 'CustomError';
    var call = remoteService.returnCustomError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      expect(r.message).to.equal(expectedError.message);
      expect(r.name).to.equal(expectedError.name);
    });
  });

});