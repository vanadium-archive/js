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

var veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');

describe('server/context_injection.js: Service function in JS', function() {
  var expectedContext = {
    name: 'suf',
    suffix : 'suf',
    remoteId: {
      names: ['test']
    }
  };

  var rt;
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
      },
      getPublicIdName: function($remoteId) {
        return $remoteId.names;
      }
    };

    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }

      rt = _rt;

      rt.serve('a/b', service).then(function() {
        done();
      }).catch(function(e) {
        done(e);
      });
    });
  });

  it('Should have access to suffix', function() {
    return rt.bindTo('a/b/suf').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('suf');
    });
  });

  it('Should see empty suffix', function() {
    return rt.bindTo('a/b/').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('');
    });
  });

  it('Should see suffix\'s trailing slash', function() {
    return rt.bindTo('a/b/suff/').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('suff/');
    });
  });

  it('Should have access to nested suffix', function() {
    return rt.bindTo('a/b/parent/suf').then(function(s) {
      var call = s.getSuffix();
      return expect(call).to.eventually.equal('parent/suf');
    });
  });

  it('Should have access to name', function() {
    return rt.bindTo('a/b/suf').then(function(s) {
      var call = s.getName();
      return expect(call).to.eventually.equal('suf');
    });
  });

  it('Should have access to context as one object', function() {
    return rt.bindTo('a/b/suf').then(function(s) {
      var call = s.getContext();
      return expect(call).to.eventually.deep.equal(expectedContext);
    });
  });

  it('Should have access to remoteId', function() {
    return rt.bindTo('a/b/suf').then(function(s) {
      var call = s.getPublicIdName();
      return expect(call).to.eventually.deep.equal(['test']);
    });

  });
  it('Should have access to context when mixed with other args', function() {
    return rt.bindTo('a/b/suf').then(function(s) {
      var call = s.getContextMixedWithNormalArgs('-a-','-b-','-c-');
      return expect(call).to.eventually.deep.equal({a1: '-a-',
          context: expectedContext,
          a2: '-b-',
          a3: '-c-'
        });
    });
  });

});
