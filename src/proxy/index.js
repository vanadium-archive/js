// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @private
 * @fileoverview An object that handles marshaling and unmarshal
 * messages from the native vanadium implementation.
 */

var EE = require('eventemitter2').EventEmitter2;
var inherits = require('inherits');
var LRU = require('lru-cache');
var MessageType = require('./message-type');
var Incoming = MessageType.Incoming;
var Outgoing = MessageType.Outgoing;
var vlog = require('./../lib/vlog');
var vom = require('../vom');
var byteUtil = require('../vdl/byte-util');
var unwrap = require('../vdl/type-util').unwrap;
var Encoder = require('../vom/encoder');
var Decoder = require('../vom/decoder');
var ByteStreamMessageReader = require('../vom/byte-stream-message-reader');
var TaskSequence = require('../lib/task-sequence');

// Cache the service signatures for one hour.
var SIGNATURE_CACHE_TTL = 3600 * 1000;

// HandlerState is an object that contains the state for a given flow.  This
// includes an optional handler for incoming messages and a task sequencer for
// decoding incoming messages.
function HandlerState(handler) {
  this.handler = handler;
  this._tasks = new TaskSequence();
}

/**
 * A client for the native vanadium implementation.
 * @constructor
 * @private
 * @param {Promise} senderPromise A promise that is resolved when we are able
 * to send a message to the native veron implementation. It should be resolved
 * with an object that has a send function that will send messages to the native
 * implementation.
 */
function Proxy(senderPromise) {
  // We use odd numbers for the message ids, so that the server can use even
  // numbers.
  this.id = 1;
  this.outstandingRequests = {};
  this.signatureCache = new LRU({
    maxAge: SIGNATURE_CACHE_TTL
  });
  this.senderPromise = senderPromise;
  this.incomingRequestHandlers = {};
  this.clientEncoder = new Encoder();
  this.clientDecoder = new Decoder(new ByteStreamMessageReader());
  EE.call(this);
}
inherits(Proxy, EE);

/**
 * Handles a message from native vanadium implementation.
 * @private
 * @param {Object} messsage The message from the native vanadium code.
 */
Proxy.prototype.process = function(message) {
  // Messages originating from server are even numbers
  var isServerOriginatedMessage = (message.id % 2) === 0;
  var handlerState = this.outstandingRequests[message.id];

  // If we don't know about this flow, just drop the message. Unless it
  // originated from the sever.
  if (!isServerOriginatedMessage && !handlerState) {
    return;
  }

  if (!handlerState) {
    // This is an server originated message that we are seeing for the
    // first time.  We need to create a handler state so we have the task
    // sequence for the input data.  If a handler gets added later, then
    // it will attached to this state.
    handlerState = new HandlerState();
    this.outstandingRequests[message.id] = handlerState;
  }
  var bytes;
  try {
    bytes = byteUtil.hex2Bytes(message.data);
  } catch (e) {
    vlog.logger.error(e);
    if (!isServerOriginatedMessage) {
      handlerState.handler.handleResponse(Incoming.ERROR_RESPONSE,
                                          message.data);
    }
    return;
  }

  var proxy = this;
  handlerState._tasks.addTask(function() {
    return proxy.processRead(message.id, handlerState.handler, bytes);
  });
};

Proxy.prototype.processRead = function(id, handler, bytes) {
  var proxy = this;
  var isServerOriginatedMessage = (id % 2) === 0;
  return vom.decode(bytes).then(function(payload) {
    payload.message = unwrap(payload.message);
    if (!handler) {
      handler = proxy.incomingRequestHandlers[payload.type];
      if (!handler) {
        // TODO(bprosnitz) There is a race condition where we receive
        // STREAM_CLOSE before a method is invoked in js and see this warning.
        vlog.logger.warn('Dropping message for unknown invoke payload ' +
                         payload.type + ' (message id: ' + id + ')');
        return;
      }
      handler.handleRequest(id, payload.type, payload.message);
    } else {
      handler.handleResponse(payload.type, payload.message);
    }
  }).catch(function(e) {
    vlog.logger.error(e.stack);
    if (!isServerOriginatedMessage) {
      handler.handleResponse(Incoming.ERROR_RESPONSE,
                             byteUtil.bytes2Hex(bytes));
    }
  });
};

Proxy.prototype.dequeue = function(id) {
  delete this.outstandingRequests[id];
};

Proxy.prototype.nextId = function() {
  var id = this.id;
  this.id += 2;
  return id;
};


Proxy.prototype.addIncomingHandler = function(type, handler) {
  this.incomingRequestHandlers[type] = handler;
};

Proxy.prototype.addIncomingStreamHandler = function(id, handler) {
  if (!this.outstandingRequests[id]) {
    this.outstandingRequests[id] = new HandlerState(handler);
  } else {
    this.outstandingRequests[id].handler = handler;
  }
};

/**
 * Arranges to notify downstream servers when the given
 * context is cancelled.  It also causes outstanding handlers for
 * those requests to receive a cancellation error.
 * @private
 */
Proxy.prototype.cancelFromContext = function(ctx, id) {
  var proxy = this;
  ctx.waitUntilDone().catch(function(error) {
    var h = proxy.outstandingRequests[id];
    proxy.sendRequest(null, Outgoing.CANCEL, null, id);
    if (h && h.handler) {
      h.handler.handleResponse(Incoming.ERROR_RESPONSE, error);
      delete proxy.outstandingRequests[id];
    }
  });
};

/**
 * Establishes the connection if needed, frames the message with the next id,
 * adds the given deferred to outstanding requests queue and sends the request
 * to the server
 * @private
 * @param {Object} message Message to send
 * @param {MessageType} type Type of message to send
 * @param {Object} handler An object with a handleResponse method that takes
 * a response type and a message.  If null, then responses for this flow
 * are ignored.
 * @param {Number} id Use this flow id instead of generating
 * a new one.
 */
Proxy.prototype.sendRequest = function(message, type, handler, id) {
  if (handler) {
    this.addIncomingStreamHandler(id, handler);
  }
  var body = {
    id: id,
    data: message,
    type: type
  };

  var self = this;
  this.senderPromise.then(function(sender) {
    sender.send(body);
  }).catch(function(err) {
    // TODO(jasoncampbell): Add tests that cover this case, also sender.send
    // above is async and will break out of the try/catch promise mechanism
    // in node.
    var h = self.outstandingRequests[id];

    if (h && h.handler) {
      h.handler.handleResponse(Incoming.ERROR_RESPONSE, err);
      delete self.outstandingRequests[id];
    }
  });
};

/*
 * Export the module
 */
module.exports = Proxy;
