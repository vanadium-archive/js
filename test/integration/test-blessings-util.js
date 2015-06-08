// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var config = require('./default-config');
var security = vanadium.security;

function validateUnionedBlessings(t, blessings) {
  t.equal(blessings.chains.length, 2, 'Should have 2 chains');
  t.equal(blessings.chains[0].length, 1, 'First chain has 1 cert');
  t.equal(blessings.chains[1].length, 1, 'Second chain has 1 cert');
  t.equal(blessings.chains[0][0].extension, 'blessedname1',
    'Get first extension on first chain');
  t.equal(blessings.chains[1][0].extension, 'blessedname2',
    'Get second extension on second chain');
  t.deepEqual(blessings.chains[0][0].publicKey, blessings.publicKey,
    'First public key matches blessing key');
  t.deepEqual(blessings.chains[1][0].publicKey, blessings.publicKey,
    'Second public key matches blessing key');
}

test('Test union of blessings', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'blessedname1')
    .then(function(blessings1) {
      return runtime.principal.blessSelf(runtime.getContext(), 'blessedname2')
      .then(function(blessings2) {
        return security.unionOfBlessings(
          runtime.getContext(), blessings1, blessings2);
      });
    })
    .then(function(unionedBlessings) {
      validateUnionedBlessings(t, unionedBlessings);
      runtime.close(t.end);
    }).catch(function(err) {
      runtime.close();
      t.end(err);
    });
  });
});

test('Test union of blessings with differing public keys', function(t) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      t.end(err);
    }

    runtime.principal.blessSelf(runtime.getContext(), 'blessedname1')
    .then(function(blessings1) {
      return runtime.principal.blessSelf(runtime.getContext(), 'blessedname2')
      .then(function(blessings2) {
        // modify the public key so it doesn't match
        blessings2.chains[0][0].publicKey[0] -= 1;
        return security.unionOfBlessings(
          runtime.getContext(), blessings1, blessings2);
      });
    })
    .then(function(unionedBlessings) {
      runtime.close();
      t.end('Should have failed due to public keys not matching');
    }).catch(function(err) {
      t.ok(err instanceof Error, 'Got error');
      t.ok(err.toString().indexOf('cannot create union of blessings ' +
        'bound to different public keys') !== -1,
        'Should get message about keys differing');
      runtime.close(t.end);
    });
  });
});
