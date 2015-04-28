// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');
var caveats = require('../../src/security/caveats');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var serve = require('./serve');
var Blessings = require('../../src/security/blessings');
var SharedContextKeys = require('../../src/runtime/shared-context-keys');

function validateBlessings(t, blessings) {
  t.ok(blessings instanceof Blessings, 'Blessings have correct type');
  t.ok(typeof blessings._id === 'number' && blessings._id !== 0,
    'Blessing has non-zero id');
  t.ok(typeof blessings.publicKey === 'string' && blessings.publicKey !== '',
    'Blessing has public key');
  t.ok(blessings._controller, 'Blessing object has controller attached');
}

test('Test bless self without Caveat', function(t) {
  var rt;
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    rt = runtime;

    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      validateBlessings(t, blessings);
      rt.close(t.end);
    }).catch(function(err) {
      t.error(err);
      rt.close(t.end);
    });
  });
});

test('Test bless self with Caveat', function(t) {
  var rt;
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    rt = runtime;

    runtime.principal.blessSelf(runtime.getContext(), 'ext',
      caveats.createExpiryCaveat(new Date()),
      function(err, blessings) {
      t.error(err);
      validateBlessings(t, blessings);
      rt.close(t.end);
    });
  });
});

test('Test bless without Caveat from server', function(t) {
  var service = {
    method: function(ctx, serverCall, cb) {
      var secCall = serverCall.securityCall;
      var rt = ctx.value(SharedContextKeys.RUNTIME);
      var remoteKey = secCall.remoteBlessings.publicKey;
      rt.principal.bless(ctx, remoteKey, secCall.localBlessings,
       'ext', function(err) {
         t.ok(err, 'Expected at least one caveat must be specfied error');
         cb();
       });
    }
  };

  serve('testing/blessnocav', leafDispatcher(service),
    function(err, res) {
      if (err) {
        res.end(t, err);
        return;
      }

      res.service.method(res.runtime.getContext(), function(err) {
        t.error(err);
        res.end(t);
      });
  });
});

test('Test bless with Caveat from server', function(t) {
  var service = {
    method: function(ctx, serverCall, cb) {
      var rt = ctx.value(SharedContextKeys.RUNTIME);
      var secCall = serverCall.securityCall;
      var remoteKey = secCall.remoteBlessings.publicKey;
      rt.principal.bless(ctx, remoteKey, secCall.localBlessings,
       'ext', caveats.createExpiryCaveat(new Date(Date.now() - 1000)),
       caveats.createConstCaveat(true), function(err, blessings) {
         t.notOk(err, 'No error expected during bless');
         validateBlessings(t, blessings);
         cb();
       });
    }
  };

  serve('testing/blesscav', leafDispatcher(service),
    function(err, res) {
      if (err) {
        res.end(t, err);
        return;
      }

      res.service.method(res.runtime.getContext(), function(err) {
        t.error(err);
        res.end(t);
      });
  });
});

test('Test bless without Caveat from client (with Granter)', function(t) {
  var expectedBlessing;

  var service = {
    method: function(ctx, serverCall) {
      t.ok(serverCall.grantedBlessings, 'Expect to get granted blessing');
      t.equal(serverCall.grantedBlessings._id, expectedBlessing._id,
        'Expect to get blessing that was granted.');
      return 'aResponse';
    }
  };

  serve('testing/clientblessgranter', leafDispatcher(service),
    function(err, res) {
      if (err) {
        t.end(err);
        return;
      }

      var client = res.runtime.newClient();
      var fiveSecondsInFuture = new Date(Date.now() + 5000);
      var granterCalled = false;
      var granterOption = client.callOption({
        granter: function(ctx, call, cb) {
          granterCalled = true;
          res.runtime.principal.bless(res.runtime.getContext(),
            call.remoteBlessings.publicKey,
            call.localBlessings,
            'ext',
            caveats.createExpiryCaveat(fiveSecondsInFuture),
            function(err, blessing) {
              expectedBlessing = blessing;
              cb(err, blessing);
            });
        }
      });

      res.service.method(res.runtime.getContext(), granterOption, function(err){
        t.ok(granterCalled, 'Granter should be called');
        t.error(err);
        res.runtime.close(t.end);
      });
    });
});

// TODO(bprosnitz) This test is weak. Improve it.
test('Test put to blessing store', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      t.ok(blessings instanceof Blessings, 'Got blessings');
      t.ok(blessings._id > 0, 'Should get non-zero blessings');

      runtime.principal.blessingStore.set(runtime.getContext(),
        blessings, 'fake/remote/pattern').then(function(oldBlessing) {
          t.equal(oldBlessing, null,
            'Should get null (no previous handle) for pattern not in store');
          return runtime.principal.blessingStore.set(runtime.getContext(),
            blessings, 'fake/remote/pattern');
        }).then(function(firstBlessing) {
          t.equal(firstBlessing._id, blessings._id,
            'Should get handle of first blessing back');
          runtime.close(t.end);
        }).catch(function(err) {
          t.notOk(err, 'Shouldn\'t get error putting to blessing store');
          runtime.close(t.end);
        });
    }).catch(function(err) {
      t.error(err, 'either blessSelf or blessingStore.set errored');
      runtime.close(t.end);
    });
  });
});

// TODO(bprosnitz) This test is weak. Improve it.
test('Test add roots', function(t) {
  var rt;
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    rt = runtime;

    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      t.ok(blessings instanceof Blessings, 'Got blessings');
      t.ok(blessings._id > 0, 'Should get non-zero blessings');

      return runtime.principal.addToRoots(runtime.getContext(), blessings);
    }).then(function() {
      rt.close(t.end);
    }).catch(function(err) {
      t.error(err, 'either blessSelf or addToRoots errored');
      rt.close(t.end);
    });
  });
});

test('Test fetching blessing debug string', function(t) {
  var rt;
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    rt = runtime;

    runtime.principal.blessSelf(runtime.getContext(), 'blessedname')
    .then(function(blessings) {
      return blessings._debugString(runtime.getContext());
    }).then(function(debugString) {
      t.ok(debugString === 'blessedname', 'Got blessed name as debug string');
      rt.close(t.end);
    }).catch(function(err) {
      t.error(err);
      rt.close(t.end);
    });
  });
});
