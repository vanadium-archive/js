// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var Promise = require('../../src/lib/promise');
var asyncHelper = require('../../src/lib/async-helper');

test('promiseFor with n === 0', function(t) {
  var numCalls = 0;
  asyncHelper.promiseFor(0, function() {
    numCalls++;
    return Promise.resolve();
  }).then(function() {
    t.equal(numCalls, 0, 'made wrong number of calls');
    t.end();
  }).catch(t.end);
});

test('promiseFor with n > 0', function(t) {
  var numCalls = 0;
  asyncHelper.promiseFor(5, function() {
    numCalls++;
    return Promise.resolve();
  }).then(function() {
    t.equal(numCalls, 5, 'made wrong number of calls');
    t.end();
  }).catch(t.end);
});

test('promiseWhile with condition always false', function(t) {
  asyncHelper.promiseWhile(function() {
    return Promise.resolve(false);
  }, function neverCall() {
    t.fail('should never have been called');
  }).then(function() {
    t.pass('success!');
    t.end();
  }).catch(t.end);
});


test('promiseWhile with simple condition', function(t) {
  var numCalls = 0;
  asyncHelper.promiseWhile(function() {
    if (numCalls < 4) {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }, function() {
    numCalls++;
    return Promise.resolve();
  }).then(function() {
    t.equal(numCalls, 4, 'made correct number of calls');
    t.end();
  }).catch(t.end);
});
