// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Channel RPCs where all messages are enqueued until a ready
 * signal is received and then all RPC messages are sent.
 */

module.exports = QueuedRpcChannelWrapper;

function QueuedRpcChannelWrapper(rpcChannel) {
  this._rpcChannel = rpcChannel;
  this._ready = false;
  this._queuedRpcs = [];
}

QueuedRpcChannelWrapper.prototype.registerRpcHandler = function(type, func) {
  this._rpcChannel.registerRpcHandler(type, func);
};

QueuedRpcChannelWrapper.prototype.performRpc = function(type, val, callback) {
  if (!this._ready) {
    this._queuedRpcs.push({
      type: type,
      val: val,
      callback: callback
    });
    return;
  }

  this._rpcChannel.performRpc(type, val, callback);
};

QueuedRpcChannelWrapper.prototype.ready = function() {
  this._ready = true;
  var rpcChannel = this._rpcChannel;
  this._queuedRpcs.forEach(function(rpc) {
    rpcChannel.performRpc(rpc.type, rpc.val, rpc.callback);
  });
};
