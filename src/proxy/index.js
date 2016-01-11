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
var byteUtil = require('../vdl/byte-util');
var unwrap = require('../vdl/type-util').unwrap;
var TypeEncoder = require('../vom/type-encoder');
var Decoder = require('../vom/decoder');
var TypeDecoder = require('../vom/type-decoder');
var RawVomReader = require('../vom/raw-vom-reader');
var ByteMessageReader = require('../vom/byte-message-reader');
var ByteMessageWriter = require('../vom/byte-message-writer');
var ByteStreamMessageReader = require('../vom/byte-stream-message-reader');
var TaskSequence = require('../lib/task-sequence');
var promiseWhile = require('../lib/async-helper').promiseWhile;

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
  this._typeWriter = new ByteMessageWriter();
  this.typeEncoder = new TypeEncoder(this._typeWriter,
                                     this._writeTypeMessage.bind(this));
  this.typeDecoder = new TypeDecoder();
  this._messageReader = new ByteStreamMessageReader();
  var proxy = this;
  this._isOpen = true;
  promiseWhile(function() {
    return Promise.resolve(proxy._isOpen);
  }, function() {
    return proxy._messageReader.nextMessageType(proxy.typeDecoder)
    .then(function(typeId) {
      if (typeId === null) {
        return proxy.cleanup();
      }
      vlog.logger.error('Unexpected type id ' + typeId);
    }).catch(function(err) {
      vlog.logger.error('Type decoder failed' + err + ': ' + err.stack);
    });
  });
  this.sequence = new TaskSequence();
  EE.call(this);
}
inherits(Proxy, EE);

Proxy.prototype._parseAndHandleMessage = function(message) {
  var messageId;
  var reader = new RawVomReader(message);
  var proxy = this;
  var isServerOriginatedMessage;
  var handlerState;
  return reader.readUint().then(function(id) {
    messageId = id;
    // Messages originating from server are even numbers
    isServerOriginatedMessage = (messageId % 2) === 0;
    handlerState = proxy.outstandingRequests[messageId];

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
      proxy.outstandingRequests[messageId] = handlerState;
    }

    return reader.readUint().then(function(type) {
      var decoder = new Decoder(new ByteMessageReader(reader));
      handlerState._tasks.addTask(proxy.processRead.bind(proxy, messageId,
                                                         type,
                                                         handlerState.handler,
                                                         decoder));
    });
  }).catch(function(e) {
    vlog.logger.error(e + ': ' + e.stack);
    if (!isServerOriginatedMessage && handlerState) {
      handlerState.handler.handleResponse(Incoming.ERROR_RESPONSE,
                                          e);
    }
  });
};
/**
 * Handles a message from native vanadium implementation.
 * @private
 * @param {string} messsage The hex encoded message from the native
 * vanadium code.
 */
Proxy.prototype.process = function(message) {
  try {
    message = byteUtil.hex2Bytes(message);
  } catch(e) {
    vlog.logger.warn('Failed to parse ' + message + ' err: ' + e + ': ' +
                     e.stack);
    return;
  }
  this.sequence.addTask(this._parseAndHandleMessage.bind(this, message));
};

Proxy.prototype.processRead = function(id, messageType, handler, decoder) {
  var isServerOriginatedMessage = (id % 2) === 0;
  var proxy = this;
  return decoder.decode().then(function(message) {
    message = unwrap(message);
    // Type messages are handled by the proxy itself.
    if (messageType === Incoming.TYPE_MESSAGE) {
      proxy._messageReader.addBytes(message);
      return;
    }
    // The handler could have been added after we did the lookup but before
    // this decode ran.
    if (!handler) {
      handler = proxy.outstandingRequests[id].handler;
    }
    if (!handler) {
      handler = proxy.incomingRequestHandlers[messageType];
      if (!handler) {
        // There is a race condition where we receive STREAM_CLOSE after we
        // finish sending the response.  This is ok, because if we sent the
        // response, then we didn't care about the stream close message.
        // This will probably go away when we move more of the rpc code into
        // JS.
        vlog.logger.warn('Dropping message for unknown invoke payload ' +
                         messageType + ' (message id: ' + id + ')');
        return;
      }
      return handler.handleRequest(id, messageType, message);
    } else {
      return handler.handleResponse(messageType, message);
    }
  }).catch(function(e) {
    vlog.logger.error(e.stack);
    if (!isServerOriginatedMessage) {
      return handler.handleResponse(Incoming.ERROR_RESPONSE, e);
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

Proxy.prototype._writeTypeMessage = function() {
  this.sendRequest(byteUtil.bytes2Hex(this._typeWriter.getBytes()),
                    Outgoing.TYPE_MESSAGE, null, 0);
  this._typeWriter.reset();
};

Proxy.prototype.cleanup = function() {
  this._isOpen = false;
};
/*
 * Export the module
 */
module.exports = Proxy;
