// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


var asyncCall = require('../lib/async-call');
var Promise = require('../lib/promise');
var vom = require('../vom');
var byteUtil = require('../vdl/byte-util');
var hexVom = require('../lib/hex-vom');
var verror = require('../gen-vdl/v.io/v23/verror');
var MessageType = require('../proxy/message-type');
var Incoming = MessageType.Incoming;
var Outgoing = MessageType.Outgoing;
var createSecurityCall = require('../security/create-security-call');
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
function GranterRouter(proxy, rootCtx, blessingsManager) {
  proxy.addIncomingHandler(Incoming.GRANTER_REQUEST, this);

  this._proxy = proxy;
  this._rootCtx = rootCtx;
  this.nextGranterId = 0;
  this.activeGranters = {};
  this._blessingsManager = blessingsManager;
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
   request = byteUtil.hex2Bytes(request);
  } catch (e) {
    returnFailure(
      new verror.NoExistError(this._rootCtx, 'failed to decode message'));
    return Promise.resolve();
  }

  var router = this;
  var granter;
  return vom.decode(request).then(function(request) {
    request = request.val;
    granter = router.activeGranters[request.granterHandle];
    if (!granter) {
      // TODO(bjornick): Pass in context here so we can generate useful error
      // messages
      return Promise.reject(
        new verror.NoExistError(router._rootCtx, 'unknown granter'));
    }
    delete router.activeGranters[request.granterHandle];
    return createSecurityCall(request.call, router._blessingsManager);
  }, function(e) {
    return Promise.reject(
      new verror.NoExistError(router._rootCtx, 'failed to decode message'));
  }).then(function(securityCall) {
    var ctx = router._rootCtx;
    var inspectFn = new InspectableFunction(granter);
    var resolve;
    var reject;
    var promise = new Promise(function(a, b) {
      resolve = a;
      reject = b;
    });
    asyncCall(ctx, null, inspectFn, ['outBlessings'],
              [ctx, securityCall], function(err, res) {
                if(err) {
                  return reject(err);
                }
                return resolve(res);
              });
    return promise;
  }).then(function(outBlessings) {
    var result = new GranterResponse({blessings: outBlessings[0]._id});
    var data = hexVom.encode(result);
    router._proxy.sendRequest(data, Outgoing.GRANTER_RESPONSE, null,
      messageId);
  }, function(e) {
    return Promise.reject(
      new verror.NoExistError(router._rootCtx, 'error while granting: ' + e));
  }).catch(returnFailure);

  function returnFailure(e) {
    var res = new GranterResponse({err: e});
    var data = byteUtil.bytes2Hex(vom.encode(res));
    router._proxy.sendRequest(data, Outgoing.GRANTER_RESPONSE,
        null, messageId);
  }
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
