// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var Promise = require('../../src/lib/promise');
var Deferred = require('../../src/lib/deferred');
var config = require('./default-config');
var timeouts = require('./timeouts');
var isBrowser = require('is-browser');
var promiseWhile = require('../../src/lib/async-helper').promiseWhile;

var NAME_PREFIX = 'new-server-testing-چשઑᜰ/';

var service = {
  changeChannel: function(ctx, serverCall) {
    throw new Error('NotImplemented');
  }
};

var fooService = {
  foo: function(ctx, serverCall) {
    return 'foo result';
  }
};

var barService = {
  bar: function(ctx, serverCall) {
    return 'bar result';
  }
};

test('Test creating a JS service named livingroom/tv - ' +
  'rt.newServer(name, service, callback)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    runtime.newServer('livingroom/tv', service, function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test creating a JS service named livingroom/tv - ' +
  'var promise = rt.newServer(name, service)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    runtime.newServer('livingroom/tv', service)
    .then(function() {
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

test('Test creating a JS service when proxy Url is invalid - '+
  'rt.newServer(name, service, callback)', function(t) {
  if (isBrowser) {
    return t.end();
  }

  vanadium.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    t.notOk(err, 'no error expected on init() since wspr isn\'t ' +
      'contacted');
    runtime.newServer('should/fail', service, function(err) {
      t.ok(err, 'should get error after attempting to serve with bad proxy');
      runtime.close(t.end);
    });
  });
});

test('Test creating a JS service when proxy Url is invalid - '+
  'var promise = runtime.newServer(name, service)', function(t) {
  if (isBrowser) {
    return t.end();
  }

  vanadium.init({ wspr: 'http://bad-address.tld' }, function(err, runtime) {
    t.notOk(err, 'no error expected on init() since wspr isn\'t ' +
      'contacted');
    runtime.newServer('should/fail', service).then(function() {
      t.fail('serve expected to fail but succeeded');
      runtime.close(t.end);
    }).catch(function(err) {
      t.ok(err, 'should get error after attempting to serve with bad proxy');
      runtime.close(t.end);
    });
  });
});

test('Test creating a JS service under multiple names - ' +
  'runtime.addName(name), runtime.removeName(name)', function(assert) {
  var ctx;

  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    var client = runtime.getClient();
    ctx = runtime.getContext();
    var server;
    runtime.newServer('livingroom/tv', service)
    .then(function addSecondName(s) {
      server = s;
      return server.addName('bedroom/tv');
    })
    .then(function bindToSecondName() {
      return client.bindTo(ctx, 'bedroom/tv');
    })
    .then(function verifySecondName(newObject){
      assert.ok(newObject && newObject.changeChannel, 'new name works');
    })
    .then(function removeSecondName() {
      return server.removeName('bedroom/tv');
    })
    .then(function waitForNameToBeRemoved() {
      var numTries = 0;
      function tryBindTo() {
        numTries++;
        if (numTries > 5) {
          return Promise.resolve(false);
        }
        var shortCtx = runtime.getContext().withTimeout(200);
        return runtime.getNamespace().resolve(shortCtx, 'bedroom/tv')
        .then(function() {
          return true;
        }).catch(function(err) {
          return false;
        });
      }
      // Resolve every 100ms until the name is removed, or 5 tries are
      // attempted.
      return promiseWhile(tryBindTo, function() {
        var def = new Deferred();
        setTimeout(function() {
          def.resolve();
        }, 100);
        return def.promise;
      });
    }).then(function bindToRemovedSecondName() {
      var shortCtx = runtime.getContext().withTimeout(100);
      client.bindTo(shortCtx, 'bedroom/tv')
      .then(function verifyRemovedSecondName(a) {
        assert.fail('should not be able to bind to a removed name');
        runtime.close(assert.end);
      }, function verifyRemovedSecondName(err) {
        assert.ok(err instanceof Error, 'should fail');
        runtime.close(assert.end);
      });
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});

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
    client = rt.getClient();
    ctx = rt.getContext();
    return Promise.all([
      rt.newServer(NAME_PREFIX + 'foo', fooService ),
      rt.newServer(NAME_PREFIX + 'bar', barService )
    ]);
  })
  .then(function publishFooAndBarUnderAdditionalNames(servers) {
    fooServer = servers[0];
    barServer = servers[1];
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
    var shortCtx = runtime.getContext().withTimeout(100);
    return fooStub.foo(shortCtx)
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
    var shortCtx = runtime.getContext().withTimeout(100);
    return barStub.bar(shortCtx)
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
