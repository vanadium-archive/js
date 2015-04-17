// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


var asyncCall = require('../lib/async-call');
var Deferred = require('../lib/deferred');
var vom = require('../vom');
var byteUtil = require('../vdl/byte-util');
var verror = require('../gen-vdl/v.io/v23/verror');
var MessageType = require('../proxy/message-type');
var Incoming = MessageType.Incoming;
var Outgoing = MessageType.Outgoing;
var SecurityCall = require('../security/call');
var InspectableFunction = require('../lib/inspectable-function');
var GranterResponse =
require('../gen-vdl/v.io/x/ref/services/wspr/internal/app').GranterResponse;
var vlog = require('./../lib/vlog');

module.exports = GranterRouter;

/**
 * A granter router handles granter requests and maintains a table of active
 * grant requests.
 * @private
 */
function GranterRouter(proxy, rootCtx) {
  proxy.addIncomingHandler(Incoming.GRANTER_REQUEST, this);

  this._proxy = proxy;
  this._rootCtx = rootCtx;
  this.nextGranterId = 0;
  this.activeGranters = {};
}

/**
 * Handle incoming grant requests.
 * @private
 */
GranterRouter.prototype.handleRequest = function(messageId, type, request) {
  if (type !== Incoming.GRANTER_REQUEST) {
    vlog.logger.error('Expected granter request type but got ' + type);
    return;
  }

  try {
   request = vom.decode(byteUtil.hex2Bytes(request));
   request = request.val;
  } catch (e) {
    // TODO(bjornick): Pass in context here so we can generate useful error
    // messages.
    var res = new GranterResponse({
      err: new verror.NoExistError(this._rootCtx, 'failed to decode message')
    });
    var data = byteUtil.bytes2Hex(vom.encode(res));
    this._proxy.sendRequest(data, Outgoing.GRANTER_RESPONSE,
        null, messageId);
  }
  var granter = this.activeGranters[request.granterHandle];
  if (!granter) {
    // TODO(bjornick): Pass in context here so we can generate useful error
    // messages.
    var res = new GranterResponse({
      err: new verror.NoExistError(this._rootCtx, 'unknown granter')
    });
    var data = byteUtil.bytes2Hex(vom.encode(res));
    this._proxy.sendRequest(data, Outgoing.GRANTER_RESPONSE,
        null, messageId);
    return;
  }
  delete this.activeGranters[request.granterHandle];


  var securityCall = new SecurityCall(request.call, this._controller);
  var ctx = this._rootCtx;
  var def = new Deferred();
  var inspectFn = new InspectableFunction(granter);
  var self = this;
  asyncCall(ctx, null, inspectFn, 1,
    [ctx, securityCall], function(err, outBlessings) {
    if (err) {
      var res = new GranterResponse({
        err: new verror.NoExistError(this._rootCtx, 'error while granting: ' +
          err)
      });
      var errData = byteUtil.bytes2Hex(vom.encode(res));
      self._proxy.sendRequest(errData, Outgoing.GRANTER_RESPONSE,
          null, messageId);
      def.resolve();
      return;
    }
    var result = new GranterResponse({blessings: outBlessings[0]._id});
    var data = byteUtil.bytes2Hex(vom.encode(result));
    self._proxy.sendRequest(data, Outgoing.GRANTER_RESPONSE, null,
      messageId);
    def.resolve();
  });
  return def.promise;
};

/**
 * Register a granter to be used with a call and generate an id representing
 * the javascript function.
 * @private
 */
GranterRouter.prototype.addGranter = function(granterFn) {
  // Create an id corresponding to the callback and send the id
  this.nextGranterId++;

  this.activeGranters[this.nextGranterId] = granterFn;
  return this.nextGranterId;
};
