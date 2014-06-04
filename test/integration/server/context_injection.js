/**
 * @fileoverview Integration tests for context injection into JS services
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */

describe('server/context_injection.js: Service function in JS', function() {
  var expectedContext = {
    name: 'b/suf',
    suffix : 'suf'
  };

  var client;
  before(function(done) {
    // Services that handles anything in a/b/* where b is the service name
    var service = {
      getSuffix: function($suffix) {
        return $suffix;
      },
      getName: function($name) {
        return $name;
      },
      getContext: function($context) {
        return $context;
      },
      getContextMixedWithNormalArgs: function(a1, $context, a2, $callback, a3) {
        $callback(null,
          {a1: a1,
          context:$context,
          a2: a2,
          a3: a3});
      }
    };

    var veyron = new Veyron(TestHelper.veyronConfig);
    // Create server object and publish the service
    var server = veyron.newServer();

    server.register('b', service).then(function() {
      return server.publish('a');
    }).then(function() {
      done();
    }).catch(function(e) {
      done(e);
    });

    client = veyron.newClient();
  });

  it('Should have access to suffix', function() {
    return client.bind('a/b/suf').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('suf');
    });
  });

  it('Should see empty suffix', function() {
    return client.bind('a/b/').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('');
    });
  });

  it('Should see suffix\'s trailing slash', function() {
    return client.bind('a/b/suff/').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('suff/');
    });
  });

  it('Should have access to nested suffix', function() {
    return client.bind('a/b/parent/suf').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('parent/suf');
    });
  });

  it('Should have access to name', function() {
    return client.bind('a/b/suf').then(function(s) {
      var call = s.getName();
      return expect(call).to.eventually.equal('b/suf');
    });
  });

  it('Should have access to context as one object', function() {
    return client.bind('a/b/suf').then(function(s) {
      var call = s.getContext();
      return expect(call).to.eventually.deep.equal(expectedContext);
    });
  });

  it('Should have access to context when mixed with other args', function() {
    return client.bind('a/b/suf').then(function(s) {
      var call = s.getContextMixedWithNormalArgs('-a-','-b-','-c-');
      return expect(call).to.eventually.deep.equal({a1: '-a-',
          context: expectedContext,
          a2: '-b-',
          a3: '-c-'
        });
    });
  });
});
