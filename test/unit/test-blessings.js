// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var Blessings = require('../../src/security/blessings');
var vom = require('./../../src/vom');
var WireBlessings =
  require('../../src/gen-vdl/v.io/v23/security').WireBlessings;

function makeTestWireBlessings() {
  return new WireBlessings({
    certificateChains: [
      [
        {
          extension: 'A',
          publicKey: new Uint8Array([1, 2, 3])
        },
        {
          extension: 'B',
          publicKey: new Uint8Array([4, 5, 6])
        }
      ],
      [
        {
          extension: 'C',
          publicKey: new Uint8Array([7, 8, 9])
        }
      ]
    ]
  });
}

function makeTestBlessings() {
  return new Blessings(makeTestWireBlessings());
}

test('Blessings constructor', function(t) {
  var blessings = makeTestBlessings();
  t.deepEquals(blessings.publicKey, new Uint8Array([4, 5, 6]),
    'Got correct public key');
  t.deepEquals(blessings.chains, makeTestWireBlessings().certificateChains,
    'Got correct chains');
  t.end();
});

test('Encode and decode of blessings', function(t) {
  var blessings = makeTestBlessings();

  var encodedBlessings = vom.encode(blessings);
  vom.decode(encodedBlessings, false, undefined,
    function(err, decodedBlessings) {
    t.error(err, 'Error decoding to Blessings');
    t.deepEquals(decodedBlessings.publicKey, blessings.publicKey,
      'Got correct public key');
    t.equals(decodedBlessings.length, blessings.length,
      'Decoded blessings are the correct length');
    t.equals(decodedBlessings.chains[0][0].extension,
      blessings.chains[0][0].extension,
      'Should get same extension');
    t.equals(decodedBlessings.chains[1][0].extension,
      blessings.chains[1][0].extension,
      'Should get same extension for second chain');
    t.deepEquals(decodedBlessings.chains[0][1].publicKey,
      blessings.chains[0][1].publicKey,
      'Should get same publicKey');
    t.end();
  });
});

test('Blessings toString', function(t) {
  var blessings = makeTestBlessings();
  t.equals(blessings.toString(), 'A/B C');
  t.end();
});
