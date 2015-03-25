// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var vanadium = require('../../');
var Blessings = require('../../src/security/blessings.js');
var config = require('./default-config');

test('Test creating a new blessing - ' +
  'runtime._newBlessings(extension, callback)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    runtime._newBlessings('alice', function(err, blessings) {
      assert.error(err);
      assert.ok(blessings instanceof Blessings, 'should be a Blessings');
      runtime.close(assert.end);
    });
  });
});

test('Test creating a new blessing - ' +
  'var promise = runtime._newBlessings(extension)', function(assert) {
  vanadium.init(config, function(err, runtime) {
    assert.error(err);

    runtime
    ._newBlessings('alice')
    .then(function(id) {
      assert.ok(id instanceof Blessings, 'should be a Blessings');
      runtime.close(assert.end);
    })
    .catch(function(err) {
      assert.error(err);
      runtime.close(assert.end);
    });
  });
});
