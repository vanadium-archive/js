/**
 * @fileoverview Integration test for Veyron Client
 * This module tests that a veyron JS client can make calls to other veyron
 * services in Go or other languages through the http proxy.
 * http proxy server and the sample Go veyron service need to be running for
 * this test.
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public 'veyron' module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */
describe('Cache Service', function() {

  var cacheService;
  var client;
  beforeEach(function(done) {

    var veyronConfig = {
      'proxy': testconfig['WSPR_SERVER_URL'],
      'logLevel': testconfig['LOG_LEVEL'],
      'identityServer': testconfig['IDENTITY_SERVER_URL']
    };

    // Create veyron object and publish the service
    var veyron = new Veyron(veyronConfig);

    client = veyron.newClient();

    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] +
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_NAME'];

    client.bind(absoluteVeyronName).then(function(service) {
      cacheService = service;
      done();
    }).catch(done);

  });

  it('Should be able to bind to the service', function() {

    expect(cacheService).to.exist;

    expect(cacheService.set).to.exist;
    expect(cacheService.set).to.be.a('function');

    expect(cacheService.get).to.exist;
    expect(cacheService.get).to.be.a('function');

    expect(cacheService.multiGet).to.exist;
    expect(cacheService.multiGet).to.be.a('function');
  });

  it('Should be able to set a value', function() {
    var resultPromise = cacheService.set('foo', 'bar');

    return expect(resultPromise).to.eventually.be.fulfilled;
  });

  it('Should be able to set and get a value', function() {
    var resultPromise = cacheService.set('foo', 'bar').then(function() {
      return cacheService.get('foo');
    });

    return expect(resultPromise).to.eventually.equal('bar');
  });

  it('Should be able to handle failure', function() {
    var resultPromise = cacheService.get('baz');

    return expect(resultPromise).to.eventually.be.rejected;
  });

  it('Should get an exception calling non-existing methods', function() {
    var fn = function() {
      cacheService.SomeNonExistingMethod('bar');
    };

    expect(fn).to.throw();
  });

  it('Should be able to do streaming gets and sets', function(done) {
    var promise = cacheService.set('foo', 'bar');
    var thenGenerator = function(i) {
      return function() {
        cacheService.set('' + i, '' + (i + 1));
      };
    };

    for (var i = 0; i < 10; i++) {
      promise = promise.then(thenGenerator(i));
    }

    var nextNumber = 1;
    promise.then(function() {
      return cacheService.multiGet();
    }).then(function(stream) {
      stream.onmessage = function(value) {
        expect(value).to.equal('' + nextNumber);
        nextNumber += 2;
      };

      // Now let's send some requests.
      for (var i = 0; i < 10; i += 2) {
        stream.send('' + i);
      }

      stream.close();
      return stream.promise;
    }).then(function() {
      expect(nextNumber).to.equal(11);
      done();
    }).catch (done);
  });

  it('Should propogate errors from onmessage callback', function(done) {
    var promise = cacheService.set('foo', 'bar');
    promise.then(function() {
      return cacheService.multiGet();
    }).then(function(stream) {
      stream.onmessage = function(value) {
        value();
      };
      stream.send('foo');
      stream.close();
      return stream.promise;
    }).then(function() {
      done('Success should not have been called');
    }).catch (function(e) {
      done();
    });
  });
});

