var test = require('prova');
var vanadium = require('../../');
var Promise = require('../../src/lib/promise');
var config = require('./default-config');
var timeouts = require('./timeouts');

var NAME_PREFIX = 'new-server-testing/';

var fooService = {
  foo: function(ctx) {
    return 'foo result';
  }
};

var barService = {
  bar: function(ctx) {
    return 'bar result';
  }
};

// TODO(bprosnitz) This test is failing on race conditions, presumably in WSPR.
// If I set breakpoints and walk through slowly, I can sometimes get to the
// end, but it is unpredictable.
// Re-enable it after fixing the races.
test('Test running several JS servers concurrently and under multiple ' +
  'names', function(assert) {
  var ctx;

  var runtime;
  var fooServer;
  var barServer;
  var fooStub;
  var barStub;
  var client;

  // big test, give it more time to finish
  assert.timeout(timeouts.long);

  return vanadium.init(config)
  .then(function createTwoServers(rt) {
    runtime = rt;
    client = rt.newClient();
    ctx = rt.getContext();
    fooServer = rt.newServer();
    barServer = rt.newServer();
  })
  .then(function serveFooAndBarServices(){
    return Promise.all([
      fooServer.serve(NAME_PREFIX + 'foo', fooService ),
      barServer.serve(NAME_PREFIX + 'bar', barService )
    ]);
  })
  .then(function publishFooAndBarUnderAdditionalNames() {
    return Promise.all([
      fooServer.addName(NAME_PREFIX + 'foo-fighter'),
      barServer.addName(NAME_PREFIX + 'bar-baz')
    ]);
  })
  .then(function bindToFoo() {
    // BindTo foo or foo-fighter which ever comes back first
    return Promise.race([
      client.bindTo(ctx, NAME_PREFIX + 'foo'),
      client.bindTo(ctx, NAME_PREFIX + 'foo-fighter')
    ]);
  })
  .then(function validateFooStub(foo) {
    fooStub = foo;
    assert.ok(fooStub['foo'], 'foo stub has method foo()');
    return fooStub.foo(ctx).then(function CallToFooRetruned(result) {
      assert.equal(result, 'foo result');
    });
  })
  .then(function stopFoo() {
    return fooServer.stop();
  })
  .then(function validateFooWasStopped() {
    return fooStub.foo(ctx)
      .then(function() {
        assert.fail('should have failed to call foo() after stop');
      }, function(err) {
        assert.ok(err);
        assert.ok(err instanceof Error);
      });
  })
  .then(function bindToBar() {
    // BindTo bar or bar-fighter which ever comes back first
    return Promise.race([
      client.bindTo(ctx, NAME_PREFIX + 'bar'),
      client.bindTo(ctx, NAME_PREFIX + 'bar-fighter')
    ]);
  })
  .then(function validateBarStub(bar) {
    barStub = bar;
    assert.ok(barStub['bar'], 'bar stub has method bar()');
    return barStub.bar(ctx).then(
      function CallToBarRetruned(result) {
      assert.equal(result, 'bar result');
    });
  })
  .then(function stopBar() {
    return barServer.stop();
  })
  .then(function validateBarWasStopped() {
    return barStub.bar(ctx)
      .then(function() {
        assert.fail('should have failed to call bar() after stop');
      }, function(err) {
        assert.ok(err);
        assert.ok(err instanceof Error);
      });
  })
  .then(end)
  .catch(end);

  function end(err) {
    assert.error(err);
    if (runtime) {
      runtime.close(assert.end);
    } else {
      assert.end();
    }
  }
});
