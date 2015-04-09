// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');
var Deferred = require('../../src/lib/deferred');
var getSecurityCallFromContext =
  require('../../src/security/context').getSecurityCallFromContext;
var aclAuthorizer = require('../../src/security/access/acl-authorizer');
var access = require('../../src/gen-vdl/v.io/v23/security/access');


var service = {
  call: function(ctx, arg) {
    return Promise.resolve(1);
  }
};


function createPromiseDispatcher(authorizer, tags) {
  function auth($context) {
    if ($context.method === '__Signature') {
      return null;
    }
    return authorizer($context);
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
  testErrorCase(assert, function (ctx, cb) {
    var def = new Deferred();
    function reject() {
      def.reject(new Error('unauthorized'));
    }
    setTimeout(reject, 0);
    return def.promise;
  }, [], true);
});

function createCallbackDispatcher(authorizer, tags) {
  function auth($context, cb) {
    if ($context.method === '__Signature') {
      cb(null);
    }
    authorizer($context, cb);
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
  testSuccessCase(assert, function (ctx, cb) {
    process.nextTick(cb.bind(null, null));
  });
});

test('Test proper context is passed to authorizer', function(assert) {
  var defaultBlessingRegex = require('./default-blessing-regex');

  testSuccessCase(assert, function (ctx, cb) {
    var call = getSecurityCallFromContext(ctx);
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
  testSuccessCase(assert, function(ctx, cb) {
    var call = getSecurityCallFromContext(ctx);
    if (call.methodTags[0] !== 'foo') {
      return cb(new Error('wrong label ' + call.label));
    }
    return cb();
  }, ['foo']);
});

var acls = {
  foo: {
    in: ['...']
  },
  bar: {}
};
var tagAclAuthorizer = aclAuthorizer(acls, access.Tag);


test('Test ACLAuthorizer (public key) - success', function(assert) {
  var tagBar = new access.Tag('Bar');

  // Passes because we reuse the same public key, despite the tag not being ok.
  testSuccessCase(assert, tagAclAuthorizer, [tagBar], true);
});

test('Test ACLAuthorizer (tag) - success', function(assert) {
  var tagFoo = new access.Tag('Foo');

  function diffPublicKeyAclAuthorizer(ctx) {
    var call = getSecurityCallFromContext(ctx);
    // get rid of public key, just for this example
    call.remoteBlessings.publicKey = '';
    tagAclAuthorizer(ctx);
  }

  // Everyone is allowed via the Foo tag.
  testSuccessCase(assert, diffPublicKeyAclAuthorizer, [tagFoo], true);
});



test('Test ACLAuthorizer (tag) - failure', function(assert) {
  var tagBar = new access.Tag('Bar');

  function diffPublicKeyAclAuthorizer(ctx) {
    var call = getSecurityCallFromContext(ctx);
    // get rid of public key, just for this example to demonstrate failure
    call.remoteBlessings.publicKey = '';
    tagAclAuthorizer(ctx);
  }

  // Nobody is allowed via the Bar tag.
  testErrorCase(assert, diffPublicKeyAclAuthorizer, [tagBar], true);
});