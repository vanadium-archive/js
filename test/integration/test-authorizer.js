var test = require('prova');
var veyron = require('../../');
var port = require('../services/config-wsprd').flags.port;
var config = {
  wspr: 'http://localhost:' + port
};
var ServiceWrapper = require('../../src/idl/idl').ServiceWrapper;
var Deferred = require('../../src/lib/deferred');

var service = {
  call: function(arg) {
    return 1;
  }
};

function createDispatcher(authorizer, label) {
  function auth(context, cb) {
    if (context.method === 'signature') {
      return null;
    }
    return authorizer(context, cb);
  }
  var metadata = {
    call: {
      label: label
    }
  };
  return function authDispatcher(suffix, method) {
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
    return runtime.serve('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('authorizer/auth');
  }

  function call(service) {
    return service.call('foo').then(function(value) {
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
    return runtime.serve('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('authorizer/auth');
  }

  function call(service) {
    return service.call('foo').then(function(value) {
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
    return runtime.serve('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('authorizer/auth');
  }

  function call(service) {
    return service.call('foo').then(function() {
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
    return runtime.serve('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('authorizer/auth');
  }

  function call(service) {
    return service.call('foo').then(function() {
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
    return runtime.serve('authorizer', dispatcher).then(function() {
      return runtime;
    });
  }

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('authorizer/auth');
  }

  function call(service) {
    return service.call('foo').then(function() {
      rt.close(assert.end);
    });
  }
});

test('authorizer - validate context', function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(assert.end);

  var endpoint = '';
  function authorizer(ctx) {
    if (ctx.remoteId.names[0] !== 'test') {
      return new Error('unknown identity ' + ctx.remoteId.names);
    } else if (ctx.localId.names[0] !== 'test') {
      return new Error('unknown identity ' + ctx.localId.names);
    } else if (ctx.method !== 'call') {
      return new Error('wrong method ' + ctx.method);
    } else if (ctx.name !== 'auth') {
      return new Error('wrong name ' + ctx.name);
    } else if (ctx.suffix !== 'auth') {
      return new Error('wrong suffix ' + ctx.suffix);
    } else if (ctx.label !== 8.0) {
      return new Error('wrong label ' + ctx.label);
    } else if (ctx.remoteEndpoint === endpoint ||
        !ctx.remoteEndpoint) {
      return new Error('bad endpoint ' + ctx.remoteEndpoint);
    } else if  (ctx.localEndpoint !== endpoint ||
        !ctx.localEndpoint) {
      return new Error('bad endpoint ' + ctx.localEndpoint);
    }

    return null;
  }

  function serve(runtime) {
    var dispatcher = createDispatcher(authorizer);
    return runtime.serve('authorizer', dispatcher).then(function(ep) {
      endpoint = ep;
      return runtime;
    });
  }

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('authorizer/auth');
  }

  function call(service) {
    return service.call('foo').then(function(value) {
      assert.equal(value, 1, 'unexpected return value');
      rt.close(assert.end);
    });
  }
});

test('authorizer - passing in labels', function(assert) {
  veyron
  .init(config)
  .then(serve)
  .then(bindTo)
  .then(call)
  .catch(assert.end);

  var endpoint = '';
  function authorizer(ctx) {
    if (ctx.label !== 4.0) {
      return new Error('wrong label ' + ctx.label);
    }
    return null;
  }

  function serve(runtime) {
    var dispatcher = createDispatcher(authorizer, 4.0);
    return runtime.serve('authorizer', dispatcher).then(function(ep) {
      endpoint = ep;
      return runtime;
    });
  }

  var rt;
  function bindTo(runtime) {
    rt = runtime;
    return runtime.bindTo('authorizer/auth');
  }

  function call(service) {
    return service.call('foo').then(function(value) {
      assert.equal(value, 1, 'unexpected return value');
      rt.close(assert.end);
    });
  }
});
