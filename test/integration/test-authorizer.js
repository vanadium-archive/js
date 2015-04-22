// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var access = require('../../src/gen-vdl/v.io/v23/security/access');
var Deferred = require('../../src/lib/deferred');
var permissionsAuthorizer =
  require('../../src/security/access/permissions-authorizer');
var serve = require('./serve');


var service = {
  call: function(ctx, serverCall, arg) {
    return Promise.resolve(1);
  }
};


function createPromiseDispatcher(authorizer, tags) {
  function auth(ctx, call) {
    if (call.method === '__Signature') {
      return null;
    }
    return authorizer(ctx, call);
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
  return function callbackDispatcher(suffix) {
    return {
      service: service,
      authorizer: auth,
    };
  };
}


function testErrorCase(assert, authorizer, tags, isPromise) {
  serve({
    name: 'authorizerTestService',
    autoBind: false,
    dispatcher: isPromise ?
      createPromiseDispatcher(authorizer, tags) :
      createCallbackDispatcher(authorizer, tags)
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'authorizerTestService/auth').then(function(service) {
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

test('Test errors are properly returned',
function(assert) {
  testErrorCase(assert, function (ctx, call) {
    var def = new Deferred();
    function reject() {
      def.reject(new Error('unauthorized'));
    }
    setTimeout(reject, 0);
    return def.promise;
  }, [], true);
});

function createCallbackDispatcher(authorizer, tags) {
  function auth(ctx, call, cb) {
    if (call.method === '__Signature') {
      cb(null);
    }
    authorizer(ctx, call, cb);
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
  return function callbackDispatcher(suffix) {
    return {
      service: service,
      authorizer: auth,
    };
  };
}

function testSuccessCase(assert, authorizer, tags, isPromise) {
  serve({
    name: 'authorizerTestService',
    autoBind: false,
    dispatcher: isPromise ?
      createPromiseDispatcher(authorizer, tags) :
      createCallbackDispatcher(authorizer, tags)
  }, function(err, res) {
    if (err) {
      return assert.end(err);
    }
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'authorizerTestService/auth').then(function(service) {
      return service.call(ctx, 'foo');
    }).then(function() {
      assert.pass('RPC resolved');
      res.end(assert);
    }).catch(function(err) {
      assert.fail('RPC rejected with error:' + err.toString());
      res.end(assert);
    });
  });
}


test('Test successes are handled', function(assert) {
  testSuccessCase(assert, function (ctx, call, cb) {
    process.nextTick(cb.bind(null, null));
  });
});

test('Test proper context is passed to authorizer', function(assert) {
  var defaultBlessingRegex = require('./default-blessing-regex');

  testSuccessCase(assert, function (ctx, call, cb) {
    if (!defaultBlessingRegex.test(call.remoteBlessingStrings[0])) {
      return cb(new Error('unknown remote blessings ' +
        call.remoteBlessingStrings));
    } else if (!defaultBlessingRegex.test(call.localBlessingStrings[0])) {
      cb(new Error('unknown local blessings ' + call.localBlessingStrings));
    } else if (call.method !== 'call') {
      return cb(new Error('wrong method ' + call.method));
    } else if (call.suffix !== 'auth') {
      return cb(new Error('wrong suffix ' + call.suffix));
    }
    // TODO(bjornick): Fix the endpoint format
    // } else if (call.remoteEndpoint === endpoint ||
    //     !call.remoteEndpoint) {
    //   return new Error('bad endpoint ' + call.remoteEndpoint);
    // } else if  (call.localEndpoint !== endpoint ||
    //     !call.localEndpoint) {
    //   return new Error('bad endpoint ' + call.localEndpoint);
    // }

    cb();
  });
});

test('Test passing in labels', function(assert) {
  testSuccessCase(assert, function(ctx, call, cb) {
    if (call.methodTags[0] !== 'foo') {
      return cb(new Error('wrong label ' + call.label));
    }
    return cb();
  }, ['foo']);
});

var perms = {
  foo: {
    in: ['...']
  },
  bar: {}
};
var tagPermsAuthorizer = permissionsAuthorizer(perms, access.Tag);


test('Test permissionsAuthorizer (public key) - success', function(assert) {
  var tagBar = new access.Tag('Bar');

  // Passes because we reuse the same public key, despite the tag not being ok.
  testSuccessCase(assert, tagPermsAuthorizer, [tagBar], true);
});

test('Test permissionsAuthorizer (tag) - success', function(assert) {
  var tagFoo = new access.Tag('Foo');

  function diffPublicKeyPermsAuthorizer(ctx, call) {
    // get rid of public key, just for this example
    call.remoteBlessings.publicKey = '';
    tagPermsAuthorizer(ctx, call);
  }

  // Everyone is allowed via the Foo tag.
  testSuccessCase(assert, diffPublicKeyPermsAuthorizer, [tagFoo], true);
});



test('Test permissionsAuthorizer (tag) - failure', function(assert) {
  var tagBar = new access.Tag('Bar');

  function diffPublicKeyPermsAuthorizer(ctx, call) {
    // get rid of public key, just for this example to demonstrate failure
    call.remoteBlessings.publicKey = '';
    tagPermsAuthorizer(ctx, call);
  }

  // Nobody is allowed via the Bar tag.
  testErrorCase(assert, diffPublicKeyPermsAuthorizer, [tagBar], true);
});
