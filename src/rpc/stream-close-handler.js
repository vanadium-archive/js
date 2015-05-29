// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Incoming = require('../proxy/message-type').Incoming;
var vlog = require('../lib/vlog');

module.exports = StreamCloseHandler;

// Handles stream closes and cancel messages.
function StreamCloseHandler(ctx) {
  this.ctx = ctx;
}

StreamCloseHandler.prototype.handleResponse = function(type, data) {
  if (type === Incoming.CANCEL) {
    if (this.ctx && this.ctx.cancel) {
      return this.ctx.cancel();
    }
  }
  if (type !== Incoming.STREAM_CLOSE) {
    vlog.logger.error('Unexpected message ' + type);
    return false;
  }
  return true;
};
