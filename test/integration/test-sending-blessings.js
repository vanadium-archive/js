// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var runtimeFromContext = require('../../src/runtime/runtime-from-context');
var types = require('../../src/vdl/types');
var WireBlessings =
  require('../../src/gen-vdl/v.io/v23/security').WireBlessings;
var caveats = require('../../src/security/caveats');
var Blessings = require('../../src/security/blessings');


var blessingsService = {
  createBlessings: function(ctx, publicKey) {
    var principal = runtimeFromContext(ctx).principal;
    var blessings = principal.defaultBlessings;
    var expiryDate = new Date((new Date()).getTime() + 6000000);
    return principal.bless(ctx, publicKey, blessings, 'friend',
                           caveats.createExpiryCaveat(expiryDate));
  },
  verifyBlessings: function(ctx) {
    // We can't look for an exact blessing, because node and browser tests
    // have different root blessings.  Instead of looking for a particular
    // blessing, we try to find the extension blessing string.
    var hasGeneratedBlessing = ctx.remoteBlessingStrings.some(function(s) {
      return s.indexOf('/friend') !== -1;
    });
    if (!hasGeneratedBlessing) {
      throw new Error('bad blessings ' + ctx.remoteBlessingStrings);
    }
    return;
  },
  _serviceDescription: {
    methods: [{
      name: 'CreateBlessings',
      inArgs: [{
        type: types.STRING
      }],
      outArgs: [{
        type: WireBlessings.prototype._type,
      }]
    }, {
      name: 'VerifyBlessings',
      inArgs: [],
      outArgs: [],
    }]
  }
};

test('Test blessings are passed as return args', function(assert) {
  serve('testing/blessings', leafDispatcher(blessingsService),
        function(err, res) {
    var principal = res.runtime.principal;
    var key = principal.defaultBlessings.publicKey;
    var ctx = res.runtime.getContext();
    res.service.createBlessings(ctx, key).then(function(blessings) {
      assert.ok(blessings instanceof Blessings, 'Is a blessing');
      return principal.putToBlessingStore(ctx, blessings, 'test');
    }).then(function() {
      return res.service.verifyBlessings(ctx);
    }).then(function() {
      assert.ok(true, 'blessings succeed');
      res.end(assert);
    }).catch(function(err) {
      assert.error(err);
      res.end(assert);
    });
  });
});