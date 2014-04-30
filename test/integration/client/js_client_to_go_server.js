/**
 * @fileoverview Integration test for Veyron Client
 * This module tests that a veyron JS client can make calls to other veyron
 * services in Go or other languages through wspr.
 * wspr server and the sample Go veyron service need to be running for
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
describe('client/js_client_to_go_server.js: Cache Service', function() {

  var cacheService;
  var client;
  var absoluteVeyronName;
  beforeEach(function(done) {

    // Create veyron object and publish the service
    var veyron = new Veyron(TestHelper.veyronConfig);

    client = veyron.newClient();

    absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';

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

  it('Should be able to bind to the sevice with a callback', function(done) {
    client.bind(absoluteVeyronName, function cb(e, cacheService) {
      expect(cacheService).to.exist;

      expect(cacheService.set).to.exist;
      expect(cacheService.set).to.be.a('function');

      expect(cacheService.get).to.exist;
      expect(cacheService.get).to.be.a('function');

      expect(cacheService.multiGet).to.exist;
      expect(cacheService.multiGet).to.be.a('function');
      done();
    });
  });

  it('Should be able to set a value', function() {
    var resultPromise = cacheService.set('foo', 'bar');

    return expect(resultPromise).to.eventually.be.fulfilled;
  });

  it('Should be able to set a value with cb', function(done) {
    cacheService.set('foo', 'bar', done);
  });

  it('Should be able to set and get a value', function() {
    var resultPromise = cacheService.set('foo', 'bar').then(function() {
      return cacheService.get('foo');
    });

    return expect(resultPromise).to.eventually.equal('bar');
  });

  it('Should be able to set and get a value with cb', function(done) {
    cacheService.set('foo', 'bar', function d1(e, v) {
      cacheService.get('foo', function d2(e, v) {
        expect(v).to.equal('bar');
        done(e);
      });
    });
  });

  it('Should be able to handle failure', function() {
    var resultPromise = cacheService.get('baz');
    return expect(resultPromise).to.eventually.be.rejectedWith(
      /key not found: baz/);
  });

  it('Should be able to handle failure with cb', function(done) {
    cacheService.get('baz', function(e) {
      if (!e) {
        done('an error should have occurred');
      } else {
        done();
      }
    });
  });

  it('Should get an exception calling non-existing methods', function() {
    var fn = function() {
      cacheService.someNonExistingMethod('bar');
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
      var stream = cacheService.multiGet();
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

  it('Should be able to treat stream as a promise', function(done) {
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
      var stream = cacheService.multiGet();
      stream.onmessage = function(value) {
        expect(value).to.equal('' + nextNumber);
        nextNumber += 2;
      };

      // Now let's send some requests.
      for (var i = 0; i < 10; i += 2) {
        stream.send('' + i);
      }

      stream.close();
      return stream;
    }).then(function() {
      expect(nextNumber).to.equal(11);
      done();
    }).catch (done);
  });

  it('Should propogate errors from onmessage callback', function(done) {
    var promise = cacheService.set('foo', 'bar');
    promise.then(function() {
      var stream = cacheService.multiGet();
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

