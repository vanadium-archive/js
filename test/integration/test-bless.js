// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');
var caveats = require('../../src/security/caveats');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
var serve = require('./serve');
var Blessings = require('../../src/security/blessings');
var SharedContextKeys = require('../../src/runtime/shared-context-keys');

test('Test bless self without Caveat', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'ext')
    .then(function(blessings) {
      t.ok(blessings instanceof Blessings, 'Got blessings');
      t.end();
    }).catch(function(err) {
      t.end(err);
    });
  });
});

test('Test bless self with Caveat', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'ext',
      caveats.createExpiryCaveat(new Date()),
      function(err, blessings) {
      if (err) {
        t.end(err);
        return;
      }
      t.ok(blessings instanceof Blessings, 'Got blessings');
      t.end();
    });
  });
});

test('Test bless without Caveat from server', function(t) {
  var service = {
    method: function(ctx, cb) {
      var rt = ctx._ctx.value(SharedContextKeys.RUNTIME);
      var remoteKey = ctx.remoteBlessings.publicKey;
      rt.principal.bless(remoteKey, ctx.localBlessings,
       'ext', function(err) {
         t.ok(err, 'Expected error');
         cb();
       });
    }
  };

  serve('testing/blessnocav', leafDispatcher(service),
    function(err, res) {
      if (err) {
        t.end(err);
        return;
      }

      res.service.method(res.runtime.getContext(), function(err) {
        t.end(err);
      });
  });
});

test('Test bless with Caveat from server', function(t) {
  var rt; // TODO This is bad. Rt should be retrieved from ctx.

  var service = {
    method: function(ctx, cb) {
      var rt = ctx._ctx.value(SharedContextKeys.RUNTIME);
      var remoteKey = ctx.remoteBlessings.publicKey;
      rt.principal.bless(remoteKey, ctx.localBlessings,
       'ext', caveats.createExpiryCaveat(new Date()),
       caveats.createConstCaveat(true), function(err) {
         t.ok(err, 'Expected error');
         cb();
       });
    }
  };

  serve('testing/blessnocav', leafDispatcher(service),
    function(err, res) {
      if (err) {
        t.end(err);
        return;
      }

      rt = res.runtime;

      res.service.method(res.runtime.getContext(), function(err) {
        t.end(err);
      });
  });
});

// TODO(bprosnitz) Add tests of blessing from client with granter
