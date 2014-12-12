var test = require('prova');
var veyron = require('../../');
var config = require('./default-config');
var Invoker = require('../../src/invocation/invoker');
var Deferred = require('../../src/lib/deferred');
var context = require('../../src/runtime/context');
var vom = require('vom');

var service = {
  call: function(arg) {
    return 1;
  }
};

function createDispatcher(authorizer, tags) {
  function auth($context, cb) {
    if ($context.method === '__Signature') {
      return null;
    }
    return authorizer($context, cb);
  }
  var desc = {
    methods: [
      {
        name: 'Call',
        inArgs: [
          {
            name: 'arg',
            type: vom.Types.ANY
          }
        ],
        tags: tags
      }
    ]
  };
  return function authDispatcher(suffix) {
    return {
      invoker: new Invoker(service, desc),
      authorizer: auth,
    };
  };
}

function teardown(getRuntime, assert) {
  return function(err) {
    var rt = getRuntime();
    assert.error(err);
    if (rt) {
      rt.close(assert.end);
    }
  };
}

test('Test errors are properly returned - synchronous', function(assert) {
  var rt;
  var end = teardown(function() { return rt; }, assert);

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .catch(end)
  .then(call);

  function authorizer(ctx) {
    return new Error('unauthorized');
  }

  function serve(runtime) {
    rt = runtime;
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      end(new Error('call should not have succeeded' + value));
    }).catch(function(err) {
      // We expect to get to the error case.
      assert.ok(err);
      end();
    });
  }
});

test('Test errors are properly returned - authorizer(ctx, cb)',
function(assert) {
  var rt;
  var end = teardown(function() { return rt; }, assert);

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .catch(end)
  .then(call);

  function authorizer(ctx, cb) {
    function reject() {
      cb(new Error('unauthorized'));
    }
    setTimeout(reject, 0);
  }

  function serve(runtime) {
    rt = runtime;
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      end(new Error('call should not have succeeded' + value));
    }).catch(function(err) {
      // we expect to get to the error case.
      assert.ok(err);
      end();
    });
  }
});

test('Test errors are properly returned - var promise = authorizer(ctx)',
function(assert) {
  var rt;
  var end = teardown(function() { return rt; }, assert);

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .catch(end)
  .then(call);

  function authorizer(ctx) {
    var def = new Deferred();
    function reject() {
      def.reject(new Error('unauthorized'));
    }
    setTimeout(reject, 0);
    return def.promise;
  }

  function serve(runtime) {
    rt = runtime;
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function() {
      end(new Error('call should not have succeeded'));
    }).catch(function(err) {
      // we expect to get to the error case.
      assert.ok(err);
      end();
    });
  }
});

test('Test successes are handled - authorizer(ctx, cb)', function(assert) {
  var rt;
  var end = teardown(function() { return rt; }, assert);

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(end);

  function authorizer(ctx, cb) {
    function resolve() {
      cb();
    }
    setTimeout(resolve, 0);
  }

  function serve(runtime) {
    rt = runtime;
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function() {
      end();
    });
  }
});

test('Test successes are handled - ' +
  'var promise = authorizer(ctx)', function(assert) {
  var rt;
  var end = teardown(function() { return rt; }, assert);

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(end);

  function authorizer(ctx) {
    var def = new Deferred();
    function resolve() {
      def.resolve();
    }
    setTimeout(resolve, 0);
    return def.promise;
  }

  function serve(runtime) {
    rt = runtime;
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function() {
      end();
    });
  }
});

test('Test proper context is passed to authorizer', function(assert) {
  var rt;
  var end = teardown(function() { return rt; }, assert);

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(end);

  function authorizer(ctx) {
    if (ctx.remoteBlessingStrings[0] !== 'test/child') {
      return new Error('unknown blessings ' + ctx.remoteBlessingStrings);
    } else if (ctx.localBlessingStrings[0] !== 'test/child') {
      return new Error('unknown blessings ' + ctx.localBlessingStrings);
    } else if (ctx.method !== 'call') {
      return new Error('wrong method ' + ctx.method);
    } else if (ctx.name !== 'auth') {
      return new Error('wrong name ' + ctx.name);
    } else if (ctx.suffix !== 'auth') {
      return new Error('wrong suffix ' + ctx.suffix);
    }
    // TODO(bjornick): Fix the endpoint format
    // } else if (ctx.remoteEndpoint === endpoint ||
    //     !ctx.remoteEndpoint) {
    //   return new Error('bad endpoint ' + ctx.remoteEndpoint);
    // } else if  (ctx.localEndpoint !== endpoint ||
    //     !ctx.localEndpoint) {
    //   return new Error('bad endpoint ' + ctx.localEndpoint);
    // }

    return null;
  }

  function serve(runtime) {
    rt = runtime;
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      assert.equal(value, 1, 'unexpected return value');
      end();
    });
  }
});

test('Test passing in labels', function(assert) {
  var rt;
  var end = teardown(function() { return rt; }, assert);

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(end);

  function authorizer(ctx) {
    if (ctx.methodTags[0] !== 'foo') {
      return new Error('wrong label ' + ctx.label);
    }
    return null;
  }

  function serve(runtime) {
    rt = runtime;
    var dispatcher = createDispatcher(authorizer, ['foo']);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      assert.equal(value, 1, 'unexpected return value');
      end();
    });
  }
});
