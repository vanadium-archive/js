// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoveriew A router that handles incoming requests to update the state
 * of the blessings cache.
 * @private
 */

var vlog = require('./../lib/vlog');
var Incoming = require('../proxy/message-type').Incoming;

module.exports = BlessingsRouter;

/**
 * A router that handles incoming requests to update the state of the blessings
 * cache.
 * @constructor
 * @private
 */
function BlessingsRouter(proxy, blessingsCache) {
  this._blessingsCache = blessingsCache;

  proxy.addIncomingHandler(Incoming.BLESSINGS_CACHE_MESSAGE, this);
}

BlessingsRouter.prototype.handleRequest = function(messageId, type, request) {
  switch (type) {
  case Incoming.BLESSINGS_CACHE_MESSAGE:
    this.handleBlessingsCacheMessages(request);
    return;
  default:
    vlog.logger.error('Unknown request type given to blessings router ' + type);
  }
};

BlessingsRouter.prototype.handleBlessingsCacheMessages = function(messages) {
  for (var i = 0; i < messages.length; i++) {
    var message = messages[i];
    if (message.hasOwnProperty('add')) {
      this._blessingsCache.addBlessings(message.add);
    } else if (message.hasOwnProperty('delete')) {
      this._blessingsCache.deleteBlessings(message.delete);
    } else {
      vlog.logger.error('Unknown blessings cache message: ', message);
    }
  }
};
