// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Incoming = require('./message-type').Incoming;
var byteUtil = require('../vdl/byte-util');
var vom = require('../vom');
var emitStreamError = require('../lib/emit-stream-error');
var vError = require('../gen-vdl/v.io/v23/verror');
var SharedContextKeys = require('../runtime/shared-context-keys');
var Blessings = require('../security/blessings');
var JsBlessings =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/principal').JsBlessings;


module.exports = Handler;

/*
 * A simple incoming stream handler that handles incoming response, error
 * and close messages and queues them on the given stream object.
 * @param {Stream} Stream instance
 * @constructor
 */
function Handler(ctx, stream) {
  this._ctx = ctx;
  this._stream = stream;
  this._controller = ctx.value(SharedContextKeys.RUNTIME)._controller;
  this._pendingBlessings = [];
}

Handler.prototype.handleResponse = function(type, data) {
  switch (type) {
    case Incoming.STREAM_RESPONSE:
      try {
        data = vom.decode(byteUtil.hex2Bytes(data));
      } catch (e) {
        emitStreamError(this._stream,
          new vError.InternalError(this._ctx,
                                   'Failed to decode result: ', e));
        return true;
      }
      if (data instanceof JsBlessings) {
        data = new Blessings(data.handle, data.publicKey, this._controller);
        data.retain();
      }
      this._stream._queueRead(data);
      return true;
    case Incoming.STREAM_CLOSE:
      this.cleanupBlessings();
      this._stream._queueClose();
      return true;
    case Incoming.ERROR_RESPONSE:
      this.cleanupBlessings();
      emitStreamError(this._stream, data);
      this._stream._queueClose();
      return true;
  }

  // can't handle the given type
  return false;
};

Handler.prototype.cleanupBlessings = function() {
  for (var i = 0; i < this._pendingBlessings; i++) {
    this._pendingBlessings[i].release();
  }
};
