// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

module.exports = TaskSequence;

var vlog = require('./vlog');
var Promise = require('../lib/promise');
/**
 * A sequencer of async operations that need to happen synchronously. The
 * queue will be processes in a FIFO order and only one operation will be
 * outstanding at a time.  This library uses Promises in the API instead of
 * callbacks since setImmediate isn't implemented in Chrome, causing nextTick
 * calls to take at least a millisecond.
 * @constructor
 * @private
 */
function TaskSequence() {
  this._lastPromise = Promise.resolve();
}

/**
 * Adds a task to a queue.
 * @param {function} task The task to run.  It should return a promise that
 * will be resolved/rejected on completion of the task.
 */
TaskSequence.prototype.addTask = function(task) {
  this._lastPromise = this._lastPromise.then(function() {
    return task();
  }).catch(function(err) {
    vlog.logger.error('Task failed with ' + err.stack);
  });
};
