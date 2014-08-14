/**
 * @fileoverview Integration tests for serve, stop
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

describe('server/server.js: Server', function(done) {
  var greeter = {
    sayHi: function() {
      console.log('Hello');
    }
  };

  it('Should get an endpoint after serve', function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, rt) {
      if (err) {
        return done(err);
      }

      var endpoint = rt.serve('tv/Hi', greeter);

      return expect(endpoint).to.eventually.have.string('@2@tcp@127.0.0.1')
          .and.notify(done);
    });
  });

  it('Should get an endpoint after serve with callback', function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, rt) {
      if (err) {
        return done(err);
      }

      rt.serve('tv/Hi', greeter, function serveDone(error, endpoint) {
        expect(endpoint).to.have.string('@2@tcp@127.0.0.1');
        done();
      });
    });
  });

  it('Should succeed serving the same name twice', function() {
    veyron.init(TestHelper.veyronConfig, function(err, rt) {
      if (err) {
        return done(err);
      }

      var endpoint = rt.serve('tv', greeter).then(function() {
        return rt.serve('tv', greeter);
      });

      return expect(endpoint).to.eventually.have.string('@2@tcp@127.0.0.1')
            .and.notify(done);
    });
  });
  // TODO(aghassemi) tests and implementation for:
  // Publishing multiple times under different names
  // Registering after serveing
});
