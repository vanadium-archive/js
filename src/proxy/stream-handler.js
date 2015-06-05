// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Incoming = require('./message-type').Incoming;
var emitStreamError = require('../lib/emit-stream-error');
var vError = require('../gen-vdl/v.io/v23/verror');
var SharedContextKeys = require('../runtime/shared-context-keys');
var BlessingsId =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/principal').BlessingsId;
var runtimeFromContext = require('../runtime/runtime-from-context');
var TaskSequence = require('../lib/task-sequence');
var Promise = require('../lib/promise');
var vom = require('../vom');
var byteUtil = require('../vdl/byte-util');

module.exports = Handler;

/*
 * A simple incoming stream handler that handles incoming response, error
 * and close messages and queues them on the given stream object.
 * @param {Stream} Stream instance
 * @constructor
 */
function Handler(ctx, stream, typeDecoder) {
  this._ctx = ctx;
  this._stream = stream;
  this._controller = ctx.value(SharedContextKeys.RUNTIME)._controller;
  this._pendingBlessings = [];
  this._tasks = new TaskSequence();
  this._typeDecoder = typeDecoder;
}

Handler.prototype.handleResponse = function(type, data) {
  switch (type) {
    case Incoming.STREAM_RESPONSE:
      this._tasks.addTask(this.handleStreamData.bind(this, data));
     return true;
    case Incoming.STREAM_CLOSE:
      this._tasks.addTask(this.handleStreamClose.bind(this, data));
      return true;
    case Incoming.ERROR_RESPONSE:
      this._tasks.addTask(this.handleStreamError.bind(this, data));
      return true;
    case Incoming.CANCEL:
      this._tasks.addTask(this.handleCancel.bind(this));
      return true;
  }

  // can't handle the given type
  return false;
};

Handler.prototype.handleStreamData = function(data) {
  try {
    data = byteUtil.hex2Bytes(data);
  } catch (e) {
    emitStreamError(this._stream,
                    new vError.InternalError(this._ctx,
                                             'Failed to decode result: ', e));
    return Promise.resolve();
  }
  var handler = this;
  return vom.decode(data, false, this._typeDecoder).then(function(data) {
    if (data instanceof BlessingsId) {
      var runtime = runtimeFromContext(handler._ctx);
      runtime.blessingsCache.blessingsFromId(data)
      .then(function(blessings) {
        blessings.retain();
        handler._stream._queueRead(blessings);
      });
    } else {
      handler._stream._queueRead(data);
    }
  }, function(e) {
    emitStreamError(handler._stream,
                    new vError.InternalError(
                      handler._ctx, 'Failed to decode result: ', e));
  });
};

Handler.prototype.handleStreamClose = function() {
  this.cleanupBlessings();
  this._stream._queueClose();
  return Promise.resolve();
};

Handler.prototype.handleStreamError = function(data) {
  emitStreamError(this._stream, data);
  return this.handleStreamClose();
};

Handler.prototype.cleanupBlessings = function() {
  for (var i = 0; i < this._pendingBlessings; i++) {
    this._pendingBlessings[i].release();
  }
};

Handler.prototype.handleCancel = function() {
  if (this.ctx && this.ctx.cancel) {
    this.ctx.cancel();
  }
};
