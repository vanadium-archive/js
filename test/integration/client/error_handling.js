/**
 * @fileoverview Integration test for error handling of Errors coming from Go
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */

var veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');

describe('client/error_handling.js: Error Thrower', function() {
  var service;
  beforeEach(function(done) {
    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/errorThrower';

    veyron.init(TestHelper.veyronConfig, function(err, rt) {
      if (err) {
        return done(err);
      }
      rt.bindTo(absoluteVeyronName).then(function(s) {
        service = s;
        done();
      }).catch(done);
    });
  });

  var assertError = function(err, expectedErr) {
    expect(err).to.be.instanceof(Error);
    expect(err).to.be.instanceof(veyron.errors.VeyronError);
    expect(err.name).to.equal(expectedErr.name);
    expect(err.message).to.equal(expectedErr.message);
    expect(err.toString()).to.equal(expectedErr.name + ': ' +
      expectedErr.message);
    expect(err.stack).to.be.empty;
  };

  it('Should be able to bind to the service', function() {
    expect(service).to.exist;
  });

  it('Should be able to throw Aborted', function() {
    var call = service.throwAborted();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.AbortedError('Aborted!');
      expect(r).to.be.instanceof(veyron.errors.AbortedError);
      assertError(r, error);
    });
  });

  it('Should be able to throw BadArg', function() {
    var call = service.throwBadArg();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.BadArgError('BadArg!');
      expect(r).to.be.instanceof(veyron.errors.BadArgError);
      assertError(r, error);
    });
  });

  it('Should be able to throw BadProtocol', function() {
    var call = service.throwBadProtocol();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.BadProtocolError('BadProtocol!');
      expect(r).to.be.instanceof(veyron.errors.BadProtocolError);
      assertError(r, error);
    });
  });

  it('Should be able to throw Internal', function() {
    var call = service.throwInternal();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.InternalError('Internal!');
      expect(r).to.be.instanceof(veyron.errors.InternalError);
      assertError(r, error);
    });
  });

  it('Should be able to throw NoAccess', function() {
    var call = service.throwNoAccess();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.NoAccessError('NoAccess!');
      expect(r).to.be.instanceof(veyron.errors.NoAccessError);
      assertError(r, error);
    });
  });

  it('Should be able to throw NoExist', function() {
    var call = service.throwNoExist();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.NoExistError('NoExist!');
      expect(r).to.be.instanceof(veyron.errors.NoExistError);
      assertError(r, error);
    });
  });

  it('Should be able to throw NoExistOrNoAccess', function() {
    var call = service.throwNoExistOrNoAccess();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error =
          new veyron.errors.NoExistOrNoAccessError('NoExistOrNoAccess!');
      expect(r).to.be.instanceof(veyron.errors.NoExistOrNoAccessError);
      assertError(r, error);
    });
  });

  it('Should be able to throw Unknown', function() {
    var call = service.throwUnknown();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.VeyronError('Unknown!');
      assertError(r, error);
    });
  });

  it('Should be able to throw GoError', function() {
    var call = service.throwGoError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.VeyronError('GoError!');
      assertError(r, error);
    });
  });

  it('Should be able to throw CustomStandardError', function() {
    var call = service.throwCustomStandardError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new veyron.errors.VeyronError('CustomStandard!');
      error.name = 'MyCustomError';
      assertError(r, error);
    });
  });
});

