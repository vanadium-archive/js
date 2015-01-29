var test = require('prova');
var serve = require('./serve');
var Deferred = require('../../src/lib/deferred');

var service = {
  call: function(ctx, arg) {
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
        tags: tags
      }
    ]
  };
  service._serviceDescription = desc;
  return function authDispatcher(suffix) {
    return {
      service: service,
      authorizer: auth,
    };
  };
}

function testErrorCase(assert, authorizer) {
  serve({
    name: 'authorizer',
    autoBind: false,
    dispatcher: createDispatcher(authorizer)
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'authorizer/auth').then(function(service) {
      service.call(ctx, 'foo').then(function(value) {
        assert.error(new Error('call should not have succeeded' + value));
        res.end(assert);
      }).catch(function(err) {
        // We expect to get to the error case.
        assert.ok(err);
        res.end(assert);
      });
    }, function(err) {
      assert.error(err);
      res.end(assert);
    });
  });
}

test('Test errors are properly returned - synchronous', function(assert) {
  testErrorCase(assert, function (ctx) {
    return new Error('unauthorized');
  });
});

test('Test errors are properly returned - authorizer(ctx, cb)',
function(assert) {
  testErrorCase(assert, function(ctx, cb) {
    function reject() {
      cb(new Error('unauthorized'));
    }
    setTimeout(reject, 0);
  });
});

test('Test errors are properly returned - var promise = authorizer(ctx)',
function(assert) {
  testErrorCase(assert, function (ctx) {
    var def = new Deferred();
    function reject() {
      def.reject(new Error('unauthorized'));
    }
    setTimeout(reject, 0);
    return def.promise;
  });
});

function testSuccessCase(assert, authorizer, tags) {
  serve({
    name: 'authorizer',
    autoBind: false,
    dispatcher: createDispatcher(authorizer, tags)
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'authorizer/auth').then(function(service) {
      return service.call(ctx, 'foo');
    }).then(function() {
      res.end(assert);
    }).catch(function(err) {
      assert.error(err);
      res.end(assert);
    });
  });
}


test('Test successes are handled - authorizer(ctx, cb)', function(assert) {
  testSuccessCase(assert, function (ctx, cb) {
    process.nextTick(cb.bind(null, null));
  });
});

test('Test successes are handled - ' +
  'var promise = authorizer(ctx)', function(assert) {
  testSuccessCase(assert, function (ctx) {
    var def = new Deferred();
    function resolve() {
      def.resolve();
    }
    setTimeout(resolve, 0);
    return def.promise;
  });
});

test('Test proper context is passed to authorizer', function(assert) {
  var defaultBlessingRegex = require('./default-blessing-regex');

  testSuccessCase(assert, function (ctx) {
    if (!defaultBlessingRegex.test(ctx.remoteBlessingStrings[0])) {
      return new Error('unknown blessings ' + ctx.remoteBlessingStrings);
    } else if (!defaultBlessingRegex.test(ctx.localBlessingStrings[0])) {
      return new Error('unknown blessings ' + ctx.localBlessingStrings);
    } else if (ctx.method !== 'call') {
      return new Error('wrong method ' + ctx.method);
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
  });
});

test('Test passing in labels', function(assert) {
  testSuccessCase(assert, function(ctx) {
    if (ctx.methodTags[0] !== 'foo') {
      return new Error('wrong label ' + ctx.label);
    }
    return null;
  }, ['foo']);
});
