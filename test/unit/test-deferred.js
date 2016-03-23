// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


var test = require('tape');
var Deferred = require('../../src/lib/deferred');

test('var deferred = new Deferred() - success', function(assert) {
  var deferred = new Deferred();

  deferred.promise
  .then(success)
  .catch(assert.end);

  process.nextTick(function() {
    deferred.resolve( 'foo');
  });

  function success(result) {
    assert.equal(result, 'foo');
    assert.end();
  }
});

test('var deferred = new Deferred() - failure', function(assert) {
  var deferred = new Deferred();
  var err = new Error('Rejecting Deferred');

  deferred.promise
  .then(assert.end, failure)
  .catch(assert.end);

  process.nextTick(function() {
    deferred.reject(err);
  });

  function failure(e) {
    assert.equal(e, err);
    assert.end();
  }
});

test('var deferred = new Deferred(callback) - success', function(assert) {
  var deferred = new Deferred(callback);

  process.nextTick(function() {
    deferred.resolve( 'foo');
  });

  function callback(err, result) {
    assert.error(err);
    assert.equal(result, 'foo');
    assert.end();
  }
});

test('var deferred = new Deferred(callback) - error', function(assert) {
  var deferred = new Deferred(callback);
  var err = new Error('Rejecting Deferred');

  process.nextTick(function() {
    deferred.reject(err);
  });

  function callback(e, result) {
    assert.equal(e, err);
    assert.notOk(result);
    assert.end();
  }
});
