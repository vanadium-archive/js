// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var RpcServerOption =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/app').RpcServerOption;
var verror = require('../gen-vdl/v.io/v23/verror');

module.exports = serverOption;

/**
 * Creates serverOption that can be passed to
 * [runtime.newServer(serverOptions)]{@link module:vanadium~Runtime#newServer}
 * to specify different server configurations.
 * @param {object} opts Server options.
 * @param {bool} opts.isLeaf Indicates server will be used to serve a leaf
 * service. This option is automatically set to true if
 * [server.serve()]{@link module:vanadium.rpc~Server#serve} is used.
 * It defaults to false if
 * [server.serveDispacther()]{@link module:vanadium.rpc~Server#serveDispatcher}
 * is used instead.
 * @param {bool} opts.servesMountTable Indicates server will be used to serve
 * a MountTable. This server cannot be used for any other purpose.
 * @return {module:vanadium.rpc~Server~ServerOption}
 * @memberof module:vanadium.rpc
 */
function serverOption(opts) {
  opts = opts || {};
  var allowedOptions = ['isLeaf', 'servesMountTable'];
  // Validate opts.
  var keys = Object.keys(opts);
  keys.forEach(function(key) {
    if (allowedOptions.indexOf(key) < 0) {
      throw new verror.BadArgError(null, 'Invalid server option ' + key);
    }
  });

  return new ServerOption(opts);
}

/**
 * @summary ServerOption represents different configurations that can be
 * specified when creating a new server.
 * @description
 * Private constructor, use
 * [vanadium.rpc.serverOption(opts)]{@link module:vanadium.rpc.serverOption}
 * to construct an instance.
 * @constructor
 * @memberof module:vanadium.rpc~Server
 * @inner
 */
function ServerOption(opts) {
  opts = opts || {};
  var allowedOptions = ['isLeaf', 'servesMountTable'];
  // Validate opts.
  var keys = Object.keys(opts);
  keys.forEach(function(key) {
    if (allowedOptions.indexOf(key) < 0) {
      throw new verror.BadArgError(null, 'Invalid server option ' + key);
    }
  });

  this._opts = opts;
}

/**
 * Convert ServerOption object to array of RpcCallOption VDL values.
 * @private
 * @return {Array} Array of RpcServerOption VDL values.
 */
ServerOption.prototype._toRpcServerOption = function(ctx, proxy) {
  var rpcCallOptions = [];
  var keys = Object.keys(this._opts);
  keys.forEach(function(key) {
    var opt = {};
    opt[key] = this._opts[key];
    rpcCallOptions.push(new RpcServerOption(opt));
  }, this);
  return rpcCallOptions;
};