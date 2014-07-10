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
describe('server/server.js: Server', function(done) {
  var greeter = {
    sayHi: function() {
      console.log('Hello');
    }
  };

  it('Should get an endpoint after serve', function() {
    var veyron = new Veyron(TestHelper.veyronConfig);

    var server = veyron.newServer();

    var endpoint = server.serve('tv/Hi', greeter);

    return expect(endpoint).to.eventually.have.string('@2@tcp@127.0.0.1');
  });

  it('Should get an endpoint after serve with callback', function(done) {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var server = veyron.newServer();

    server.serve('tv/Hi', greeter, function serveDone(error, endpoint) {
      expect(endpoint).to.have.string('@2@tcp@127.0.0.1');
      done();
    });
  });

  it('Should succeed serving the same name twice', function() {
    var veyron = new Veyron(TestHelper.veyronConfig);
    var server = veyron.newServer();

    var endpoint = server.serve('tv', greeter).then(function() {
      return server.serve('tv', greeter);
    });

    return expect(endpoint).to.eventually.have.string('@2@tcp@127.0.0.1');
  });
  // TODO(aghassemi) tests and implementation for:
  // Publishing multiple times under different names
  // Registering after serveing
});
