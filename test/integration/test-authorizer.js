var test = require('prova');
var veyron = require('../../');
var config = {
  wspr: 'http://' + process.env.WSPR_ADDR
};
var ServiceWrapper = require('../../src/idl/idl').ServiceWrapper;
var Deferred = require('../../src/lib/deferred');
var context = require('../../src/runtime/context');

var service = {
  call: function(arg) {
    return 1;
  }
};

function createDispatcher(authorizer, tags) {
  function auth(context, cb) {
    if (context.method === 'signature') {
      return null;
    }
    return authorizer(context, cb);
  }
  var metadata = {
    call: {
      tags: tags
    }
  };
  return function authDispatcher(suffix) {
    return {
      service: new ServiceWrapper(service, metadata),
      authorizer: auth,
    };
  };
}

test('authorizer - errors are properly returned', function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .catch(assert.end)
  .then(call);

  function authorizer(ctx) {
    return new Error('unauthorized');
  }

  function serve(runtime) {
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      assert.fail('call should not have succeeded' + value);
      assert.end();
    }).catch(function() {
      rt.close(assert.end);
    });
  }
});

test('authorizer(ctx, cb) - errors are properly returned', function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .catch(assert.end)
  .then(call);

  function authorizer(ctx, cb) {
    function reject() {
      cb(new Error('unauthorized'));
    }
    setTimeout(reject, 0);
  }

  function serve(runtime) {
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      assert.fail('call should not have succeeded' + value);
    }).catch(function() {
      rt.close(assert.end);
    });
  }
});

test('var promise = authorizer(ctx) - errors are properly returned',
function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .catch(assert.end)
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
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function() {
      assert.fail('call should not have succeeded');
    }).catch(function() {
      rt.close(assert.end);
    });
  }
});

test('authorizer(ctx, cb) - successes are handled', function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(assert.end);

  function authorizer(ctx, cb) {
    function resolve() {
      cb();
    }
    setTimeout(resolve, 0);
  }

  function serve(runtime) {
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function() {
      rt.close(assert.end);
    });
  }
});

test('var promise = authorizer(ctx) - successes are handled', function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(assert.end);

  function authorizer(ctx) {
    var def = new Deferred();
    function resolve() {
      def.resolve();
    }
    setTimeout(resolve, 0);
    return def.promise;
  }

  function serve(runtime) {
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function() {
      rt.close(assert.end);
    });
  }
});

test('authorizer - validate context', function(assert) {
  var rt;

  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(function(err) {
    assert.error(err);

    if (rt) {
      rt.close(assert.end);
    }
  });

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
    var dispatcher = createDispatcher(authorizer);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      assert.equal(value, 1, 'unexpected return value');
      rt.close(assert.end);
    });
  }
});

// TODO(bjornick, nlacasse): Fix this test and uncomment.
test.skip('authorizer - passing in labels', function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(assert.end);

  function authorizer(ctx) {
    if (ctx.methodTags[0] !== 'foo') {
      return new Error('wrong label ' + ctx.label);
    }
    return null;
  }

  function serve(runtime) {
    var dispatcher = createDispatcher(authorizer, ['foo']);
    return runtime.serveDispatcher('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var ctx = context.Context();

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo(ctx, 'authorizer/auth');
  }

  function call(service) {
    return service.call(ctx, 'foo').then(function(value) {
      assert.equal(value, 1, 'unexpected return value');
      rt.close(assert.end);
    });
  }
});
