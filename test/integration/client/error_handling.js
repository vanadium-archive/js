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
describe('Error Thrower', function() {

  var service;
  beforeEach(function(done) {

    var veyron = new Veyron(TestHelper.veyronConfig);
    var client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/errorthrower';

    client.bind(absoluteVeyronName).then(function(s) {
      service = s;
      done();
    }).catch(done);

  });

  var assertError = function(err, expectedErr) {
    expect(err).to.be.instanceof(Error);
    expect(err).to.be.instanceof(Veyron.Errors.VeyronError);
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
      var error = new Veyron.Errors.AbortedError('Aborted!');
      expect(r).to.be.instanceof(Veyron.Errors.AbortedError);
      assertError(r, error);
    });
  });

  it('Should be able to throw BadArg', function() {
    var call = service.throwBadArg();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.BadArgError('BadArg!');
      expect(r).to.be.instanceof(Veyron.Errors.BadArgError);
      assertError(r, error);
    });
  });

  it('Should be able to throw BadProtocol', function() {
    var call = service.throwBadProtocol();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.BadProtocolError('BadProtocol!');
      expect(r).to.be.instanceof(Veyron.Errors.BadProtocolError);
      assertError(r, error);
    });
  });

  it('Should be able to throw Internal', function() {
    var call = service.throwInternal();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.InternalError('Internal!');
      expect(r).to.be.instanceof(Veyron.Errors.InternalError);
      assertError(r, error);
    });
  });

  it('Should be able to throw NotAuthorized', function() {
    var call = service.throwNotAuthorized();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.NotAuthorizedError('NotAuthorized!');
      expect(r).to.be.instanceof(Veyron.Errors.NotAuthorizedError);
      assertError(r, error);
    });
  });

  it('Should be able to throw NotFound', function() {
    var call = service.throwNotFound();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.NotFoundError('NotFound!');
      expect(r).to.be.instanceof(Veyron.Errors.NotFoundError);
      assertError(r, error);
    });
  });

  it('Should be able to throw Unknown', function() {
    var call = service.throwUnknown();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.VeyronError('Unknown!');
      assertError(r, error);
    });
  });

  it('Should be able to throw GoError', function() {
    var call = service.throwGoError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.VeyronError('GoError!');
      assertError(r, error);
    });
  });

  it('Should be able to throw CustomStandardError', function() {
    var call = service.throwCustomStandardError();
    return expect(call).to.eventually.be.rejected.then(function(r) {
      var error = new Veyron.Errors.VeyronError('CustomStandard!');
      error.name = 'MyCustomError';
      assertError(r, error);
    });
  });

});

