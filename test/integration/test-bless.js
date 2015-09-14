// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var Blessings = require('../../src/security/blessings');
var serve = require('./serve');
var security = vanadium.security;

function validateBlessings(t, blessings) {
  t.ok(blessings instanceof Blessings, 'Blessings have correct type');
  t.ok(blessings.chains.length > 0, 'Non-empty chains');
  t.ok(blessings.publicKey, 'Public key is set');
}

test('Test bless self without Caveat', function(t) {
  var rt;
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    rt = runtime;

    runtime.principal.blessSelf(runtime.getContext(), 'blessedname')
    .then(function(blessings) {
      validateBlessings(t, blessings);
      t.equal(blessings.chains.length, 1, 'Has exactly one chain');
      t.equal(blessings.chains[0].length, 1, 'Chain has exactly one blessing');
      t.equal(blessings.chains[0][0].extension, 'blessedname',
        'Has correct extension');
      t.equal(blessings.chains[0][0].caveats.length, 0, 'Has no caveats');
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

    var cav = security.createExpiryCaveat(new Date());
    runtime.principal.blessSelf(runtime.getContext(), 'blessedname', cav,
      function(err, blessings) {
      t.error(err);
      validateBlessings(t, blessings);
      t.equal(blessings.chains.length, 1, 'Has exactly one chain');
      t.equal(blessings.chains[0].length, 1, 'Chain has exactly one blessing');
      t.equal(blessings.chains[0][0].extension, 'blessedname',
        'Has correct extension');
      t.equal(blessings.chains[0][0].caveats.length, 1, 'Has one caveat');
      t.deepEqual(blessings.chains[0][0].caveats[0], cav, 'Has correct caveat');
      rt.close(t.end);
    });
  });
});

test('Test bless without Caveat from server', function(t) {
  var service = {
    method: function(ctx, serverCall, cb) {
      var secCall = serverCall.securityCall;
      var rt = vanadium.runtimeForContext(ctx);
      var remoteKey = secCall.remoteBlessings.publicKey;
      rt.principal.bless(ctx, remoteKey, secCall.localBlessings,
       'ext', function(err) {
         t.ok(err, 'Expected at least one caveat must be specified error');
         cb(null, null);
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
      var rt = vanadium.runtimeForContext(ctx);
      var secCall = serverCall.securityCall;
      var remoteKey = secCall.remoteBlessings.publicKey;
      var expiryCav = security.createExpiryCaveat(new Date(Date.now() - 1000));
      var constCav = security.createConstCaveat(true);
      rt.principal.bless(ctx, remoteKey, secCall.localBlessings,
       'ext', expiryCav, constCav, function(err, blessings) {
         t.notOk(err, 'No error expected during bless');
         validateBlessings(t, blessings);
         for (var i = 0; i < blessings.chains.length; i++) {
           var chain = blessings.chains[i];
           t.equal(chain[chain.length - 1].extension, 'ext',
            'Expected final extension to match');
           t.deepEqual(chain[chain.length - 1].caveats.sort(objectSorter),
             [expiryCav, constCav].sort(objectSorter),
             'Has correct caveats');
         }
         cb(null, null);
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
      t.deepEqual(serverCall.grantedBlessings, expectedBlessing,
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

      var client = res.runtime.getClient();
      var fiveSecondsInFuture = new Date(Date.now() + 5000);
      var granterCalled = false;
      var granterOption = client.callOption({
        granter: function(ctx, call, cb) {
          granterCalled = true;
          res.runtime.principal.bless(res.runtime.getContext(),
            call.remoteBlessings.publicKey,
            call.localBlessings,
            'ext',
            security.createExpiryCaveat(fiveSecondsInFuture),
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

// Tests add roots by trying to invoke a method with a blessing not in the
// roots and then adding it to the roots.
test('Test add roots', function(t) {
  var service = {
    method: function(ctx, serverCall) {
      return 'aResponse';
    }
  };

  var authorizer = function(ctx, securityCall) {
    var hasBlessedName = securityCall.remoteBlessingStrings.some(function(str) {
      return str === 'blessedname';
    });
    if (hasBlessedName) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('Expected blessedname in blessings'));
  };

  serve('testing/addroots', leafDispatcher(service, authorizer),
    function(err, res) {
    if (err) {
      t.end(err);
      return;
    }

    var runtime = res.runtime;
    var ctx = runtime.getContext();
    var blessings;
    var origDefault;
    var origTripDot;
    runtime.principal.blessSelf(ctx, 'blessedname')
    .then(function(selfBlessings) {
      blessings = selfBlessings;
      validateBlessings(t, blessings);
      // Get the original blessings used for '...' and save them for later.
      return runtime.principal.blessingStore.forPeer(ctx, '...');
    }).then(function(oldBlessings) {
      origTripDot = oldBlessings;
      // Replace it with the union of the old and the new self-blessing
      return vanadium.security.unionOfBlessings(ctx, oldBlessings, blessings);
    }).then(function(unionedBlessings) {
      return runtime.principal.blessingStore.set(ctx, unionedBlessings, '...');
    }).then(function() {
      // Get the original default blessings and save them for later.
      return runtime.principal.blessingStore.getDefault(ctx);
    }).then(function(oldDefault) {
      origDefault = oldDefault;
      // Replace it with the union of the old and the new self-blessing
      return vanadium.security.unionOfBlessings(ctx, oldDefault, blessings);
    }).then(function(unionedBlessings) {
      return runtime.principal.blessingStore.setDefault(ctx, unionedBlessings);
    }).catch(function(err) {
      t.error('Failed to configure blessings: ' + err);
    }).then(function() {
      // Attempt to call the method; it should fail.
      return res.service.method(ctx);
    }).then(function() {
      t.error('Method call unexpectedly succeeded without valid roots');
    }).catch(function() {
      return runtime.principal.addToRoots(ctx, blessings);
    }).then(function() {
      // Call the method after addToRoots; it should succeed.
      return res.service.method(ctx);
    }).then(function(result) {
      t.equal(result, 'aResponse', 'Got correct result');
    }).catch(function(err) {
      t.error('either blessSelf or addToRoots errored ' + err);
    }).then(function() {
      // Reset the blessingStore for default blessings.
      return runtime.principal.blessingStore.setDefault(ctx, origDefault);
    }).then(function() {
      // Reset the blessingStore for peer '...'
      return runtime.principal.blessingStore.set(ctx, origTripDot, '...');
    }).catch(function(err) {
      t.error('Unexpected error resetting blessing store');
    }).then(function(){
      res.end(t);
    });
  });
});

function objectSorter(a, b) {
  return JSON.stringify(a) < JSON.stringify(b);
}
