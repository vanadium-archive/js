// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Forwards messages to and from a nacl module.
 * @private
 */

var Deferred = require('../lib/deferred');
var errors = require('../verror/index');
var extensionEventProxy = require('../browser/event-proxy');
var Proxy = require('./index');
var TaskSequence = require('../lib/task-sequence');
var random = require('../lib/random');
var vlog = require('./../lib/vlog');
var vom = require('../vom');
var byteUtil = require('../vdl/byte-util');

module.exports = ProxyConnection;

/**
 * A client for the vanadium service using postMessage. Connects to the vanadium
 * browspr and performs RPCs.
 * @constructor
 * @private
 */
function ProxyConnection() {
  var self = this;

  this.instanceId = random.hex();
  this._tasks = new TaskSequence();

  this.onBrowsprMsg = function(msg) {
    var body;
    try {
      body = byteUtil.hex2Bytes(msg.body);
    } catch (e) {
      vlog.logger.warn('Failed to parse ' + msg.body + 'err: ' + e);
      return;
    }
    // We add this to the task queue to make sure that the decode callback for
    // all the messages are peformed in order.
    self._tasks.addTask(decodeAndProcess);
    function decodeAndProcess() {
      return vom.decode(body).then(function(body) {
        if (msg.instanceId === self.instanceId) {
          self.process(body);
        }
      }, function(e) {
        vlog.logger.error('Failed to parse ' + msg.body + 'err: ' + e);
        return;
      });
    }
  };

  extensionEventProxy.on('browsprMsg', this.onBrowsprMsg);

  // rethrow crash error when proxy fails.
  this.onCrash = function(msg) {
    self.emit('crash', new errors.ExtensionCrashError(msg));
  };

  extensionEventProxy.on('crash', this.onCrash);

  var def = new Deferred();
  Proxy.call(this, def.promise);
  def.resolve(this);
}

ProxyConnection.prototype = Object.create(Proxy.prototype);

ProxyConnection.prototype.constructor = ProxyConnection;

ProxyConnection.prototype.send = function(msg) {
  var wrappedMsg = {
    instanceId: this.instanceId,
    msg: msg
  };
  extensionEventProxy.send('browsprMsg', wrappedMsg);
};

ProxyConnection.prototype.close = function(cb) {
  var self = this;
  var defaultTimeout = 2000;
  var deferred = new Deferred(cb);

  extensionEventProxy.removeListener('crash', this.onCrash);

  extensionEventProxy.send('browsprCleanup', {
    instanceId: this.instanceId
  });

  var timedout = false;
  var timeout = setTimeout(function reject() {
    timedout = true;
    extensionEventProxy.removeListener('browsprMsg', self.onBrowsprMsg);
    var err = new Error('Timeout: Failed to close the runtime in ' +
      defaultTimeout + ' ms');

    deferred.reject(err);
  }, defaultTimeout);

  extensionEventProxy.once('browsprCleanupFinished', function() {
    extensionEventProxy.removeListener('browsprMsg', self.onBrowsprMsg);
    clearTimeout(timeout);
    if(!timedout) {
      deferred.resolve();
    }
  });

  return deferred.promise;
};

ProxyConnection.prototype.createInstance = function(settings, cb) {
  var msg = {
    instanceId: this.instanceId,
    settings: settings
  };
  extensionEventProxy.sendRpc('createInstance', msg, cb);
};
