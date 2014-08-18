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

var veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');

var Promise = require('es6-promise').Promise;

describe('client/js_client_to_go_server.js: Cache Service', function() {
  var cacheService;
  var absoluteVeyronName;
  var rt;
  beforeEach(function(done) {
    absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';

    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;
      rt.bindTo(absoluteVeyronName).then(function(s) {
        cacheService = s;
        done();
      }).catch(done);
    });
  });

  it('Should be able to bindTo to the service', function() {
    expect(cacheService).to.exist;

    expect(cacheService.set).to.exist;
    expect(cacheService.set).to.be.a('function');

    expect(cacheService.get).to.exist;
    expect(cacheService.get).to.be.a('function');

    expect(cacheService.multiGet).to.exist;
    expect(cacheService.multiGet).to.be.a('function');
  });

  it('Should be able to bindTo to the sevice with a callback', function(done) {
    rt.bindTo(absoluteVeyronName, function cb(e, cacheService) {
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
    var promises = [];
    promises.push(cacheService.set('foo', 'bar'));
    for (var i = 0; i < 10; ++i) {
      promises.push(
        cacheService.set(i.toString(), (i + 1).toString()));
    }

    var nextNumber = 1;
    Promise.all(promises).then(function() {
      var promise = cacheService.multiGet();
      var stream = promise.stream;
      stream.on('data', function(value) {
        if (value) {
          expect(value).to.equal(nextNumber.toString());
          nextNumber += 2;
        }
      });
      stream.read();
      // Now let's send some requests.
      for (var i = 0; i < 10; i += 2) {
        stream.write(i.toString());
      }

      stream.end();
      return promise;
    }).then(function() {
      expect(nextNumber).to.equal(11);
      done();
    }).catch (done);
  });
});
