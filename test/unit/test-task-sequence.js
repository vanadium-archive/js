// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var Promise = require('../../src/lib/promise');
var TaskSequence = require('../../src/lib/task-sequence');
var promiseFor = require('../../src/lib/async-helper').promiseFor;

test('task sequence', function(t) {
  var callOrder = [];
  function callSequence(n) {
    var numLoop = 5 - n;
    // Create a promise chain of 5 - n and then append to the array.  We create
    // a longer promise chain for early tasks to make sure that the task
    // queue waits for early tasks to finish before starting later tasks.  If
    // the tasks were run in parallel, then later tasks with shorter chains
    // will catch up to earlier promises.
    return promiseFor(numLoop, function() {
      return Promise.resolve();
    }).then(function() {
      callOrder.push(n);
    });
  }
  var sequence = new TaskSequence();
  for (var i = 0; i < 5; i++) {
    sequence.addTask(callSequence.bind(null, i));
  }
  sequence.addTask(function() {
    t.deepEqual(callOrder, [0, 1, 2, 3, 4]);
    t.end();
    return Promise.resolve();
  });
});

test('task continues after a failure', function(t) {
  var sequence = new TaskSequence();
  sequence.addTask(function() {
    throw new Error('Bad!!!');
  });
  sequence.addTask(function() {
    t.pass('task run after failure');
    t.end();
  });
});
