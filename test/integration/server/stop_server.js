/**
 * @fileoverview Integration test for stopping and re-publishing a server in JS
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */
describe('server/stop_server.js: Stopping a published JS server', function() {

  var server;
  var client;
  function publish(name) {
    var service = {
      foo: function() {
        return 'bar';
      }
    };
    var veyron = new Veyron(TestHelper.veyronConfig);
    server = veyron.newServer();
    server.register('foo', service);
    return server.publish(name).then(function() {
      client = veyron.newClient();
      return client.bindTo(name + '/foo');
    }).then(function(s) {
      // ensure we can call foo() before returning
      return s.foo().then(function(val) {
        expect(val).to.equal('bar');
        return {
          service: s,
          server: server
        };
      });
    });
  }

  it('Should be able to stop a server', function(done) {
    var service;
    // publish a new server
    publish('stopservice/test1').then(function(s) {
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

  it('Should be able to re-publish a stopped server', function(done) {
    var server;
    // publish a new server
    publish('stopservice/test2').then(function(s) {
      // stop the server
      server = s.server;
      return server.stop();
    }).then(function publishAgain() {
      return server.publish('stopservice/test2');
    }).then(function bindToNewlyPublished() {
      return client.bindTo('stopservice/test2/foo');
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
    // publish a new server
    publish('stopservice/test2').then(function(s) {
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

  it('Should not get error stopping an unpublished server', function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    server = veyron.newServer();
    server.stop().then(function() {
      done();
    }).catch(function(e) {
      done(e);
    });
  });

});
