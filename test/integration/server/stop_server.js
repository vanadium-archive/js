/**
 * @fileoverview Integration test for stopping and re-serveing a server in JS
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

describe('server/stop_server.js: Stopping a served JS server', function() {
  var rt;

  var service = {
    foo: function() {
      return 'bar';
    }
  };

  function serve(name) {
    return veyron.init(TestHelper.veyronConfig).then(function(_rt) {
      rt = _rt;
      return rt.serve(name + '/foo', service).then(function() {
        return rt.bindTo(name + '/foo');
      }).then(function(s) {
        // ensure we can call foo() before returning
        return s.foo().then(function(val) {
          expect(val).to.equal('bar');
          return {
            service: s,
            server: rt._getServer()
          };
        });
      });
    });
  }

  it('Should be able to stop a server', function(done) {
    var service;
    // serve a new server
    serve('stopservice/test1').then(function(s) {
      // stop the server
      service = s.service;
      return s.server.stop();
    }).then(function tryCallingFooAgain() {
      // we should not be able to call foo again
      return service.foo().then(function(val) {
        done('Should have failed because server was stopped');
      }, function(err) {
        expect(err.message).to.exist;
        done();
      });
    }).catch(done);
  });

  it('Should be able to re-serve a stopped server', function(done) {
    var server;
    // serve a new server
    serve('stopservice/test2').then(function(s) {
      // stop the server
      server = s.server;
      return server.stop();
    }).then(function serveAgain() {
      return server.serve('stopservice/test2', service);
    }).then(function bindToNewlyPublished() {
      return rt.bindTo('stopservice/test2/foo');
    }).then(function callFooAgain(service) {
      return service.foo();
    }).then(function(val) {
      expect(val).to.equal('bar');
      done();
    }).catch(function(e) {
      done(e);
    });
  });

  it('Should not get error stopping an already stopped server', function(done) {
    var server;
    // serve a new server
    serve('stopservice/test2').then(function(s) {
      // stop the server
      server = s.server;
      return server.stop();
    }).then(function stopAgain() {
      return server.stop();
    }).then(function() {
      done();
    }).catch(function(e) {
      done(e);
    });
  });
});
