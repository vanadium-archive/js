/**
 * @fileoverview An object that handles marshaling and unmarshal
 * messages from the native veyron implementation.
 */

var MessageType = require('./message-type');
var IncomingPayloadType = require('./incoming-payload-type');
var Deferred = require('./../lib/deferred');
var vLog = require('./../lib/vlog');
var SimpleHandler = require('./simple-handler');
var DecodeUtil = require('../lib/decode-util');
var vError = require('./../lib/verror');

// Cache the service signatures for one hour.
var BIND_CACHE_TTL = 3600 * 1000;

/**
 * A client for the native veyron implementation.
 * @constructor
 * @param {Promise} sender A promise that is resolved when we are able to send
 * a message to the native veron implementation. It should be resolved with an
 * object that has a send function that will send messages to the native
 * implementation.
 */
function Proxy(sender) {
  // We use odd numbers for the message ids, so that the server can use even
  // numbers.
  this.id = 1;
  this.outstandingRequests = {};
  this.bindCache = {};
  this.senderPromise = sender;
  this.incomingRequestHandlers = {};
}

/**
 * Handles a message from native veyron implementation.
 * @param {Object} messsage The message from the native veyron code.
 */
Proxy.prototype.process = function(message) {
  // Messages originating from server are even numbers
  var isServerOriginatedMessage = (message.id % 2) === 0;

  var handler = this.outstandingRequests[message.id];

  var payload;
  try {
    payload = JSON.parse(message.data);
  } catch (e) {
    if (!isServerOriginatedMessage) {
      handler.handleResponse(IncomingPayloadType.ERROR_RESPONSE, message.data);
    }
    return;
  }

  // If we don't know about this flow, just drop the message. Unless it
  // originated from the sever.
  if (!isServerOriginatedMessage && !handler) {
    vLog.warn('Dropping message for unknown flow ' + message.id + ' ' +
        message.data);
    return;
  }

  if (!handler) {
    handler = this.incomingRequestHandlers[payload.type];
    if (!handler) {
      // TODO(bprosnitz) There is a race condition where we receive STREAM_CLOSE
      // before a method is invoked in js and see this warning.
      vLog.warn('Dropping message for unknown invoke payload ' + payload.type +
        ' (message id: ' + message.id + ')');
      return;
    }
    handler.handleRequest(message.id, payload.type, payload.message);
  } else {
    handler.handleResponse(payload.type, payload.message);
  }
};

Proxy.prototype.dequeue = function(id) {
  delete this.outstandingRequests[id];
};

Proxy.prototype.nextId = function() {
  var id = this.id;
  this.id += 2;
  return id;
};

/**
 * Gets the signature including methods names, number of arguments for a given
 * service name.
 * @param {Context} A context instance.
 * @param {string} name the veyron name of the service to get signature for.
 * @return {Promise} Signature of the service in JSON format
 */
Proxy.prototype.getServiceSignature = function(ctx, name) {
  var proxy = this;
  var deferred = new Deferred();
  var now = Date.now;

  // TODO(jasoncampbell): Cache logic should be isolated elsewhere and
  // attached to the Proxy instance. The async-cache module with maxAge set
  // to BIND_CACHE_TTL would be a good fit here:
  // https://www.npmjs.org/package/async-cache
  var cache = this.bindCache[name];

  if (cache && (now() - cache.fetched < BIND_CACHE_TTL)) {
    deferred.resolve(cache.signature);
    return deferred.promise;
  }

  var p = deferred.promise.then(function(signature) {
    // If the signature came off the wire, we need to vom decode the bytes.
    // TODO(bjornick): Move the try-catch to a different function so that
    // v8 doesn't de-optimize this whole function.
    if (typeof signature === 'string') {
      try {
        return DecodeUtil.decode(signature);
      } catch (e) {
        return Promise.reject(
          new vError.InternalError('Failed to decode result: ' + e));
      }
    }
  });
  p.then(function(signature) {
    proxy.bindCache[name] = {
      signature: signature,
      fetched: now()
    };
  });

  var messageJSON = { name: name };
  var message = JSON.stringify(messageJSON);

  var id = proxy.nextId();
  var handler = new SimpleHandler(deferred, proxy, id);
  this.cancelFromContext(ctx, id);
  proxy.sendRequest(message, MessageType.SIGNATURE, handler, id);

  return p;
};


Proxy.prototype.addIncomingHandler = function(type, handler) {
  this.incomingRequestHandlers[type] = handler;
};

Proxy.prototype.addIncomingStreamHandler = function(id, handler) {
  this.outstandingRequests[id] = handler;
};

/*
 * Arranges to notify downstream servers when the given
 * context is cancelled.  It also causes outstanding handlers for
 * those requests to receive a cancellation error.
 */
Proxy.prototype.cancelFromContext = function(ctx, id) {
  var proxy = this;
  ctx.waitUntilDone().catch(function(error) {
    var h = proxy.outstandingRequests[id];
    proxy.sendRequest(null, MessageType.CANCEL, null, id);
    if (h) {
      h.handleResponse(IncomingPayloadType.ERROR_RESPONSE, error);
      delete proxy.outstandingRequests[id];
    }
  });
};

/**
 * Establishes the connection if needed, frames the message with the next id,
 * adds the given deferred to outstanding requests queue and sends the request
 * to the server
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
    this.outstandingRequests[id] = handler;
  }
  var body = JSON.stringify({ id: id, data: message, type: type });

  var self = this;
  this.senderPromise.then(function(sender) {
    sender.send(body);
  }).catch(function(err) {
    // TODO(jasoncampbell): Add tests that cover this case, also sender.send
    // above is async and will break out of the try/catch promise mechanism
    // in node.
    var h = self.outstandingRequests[id];

    if (h) {
      h.handleResponse(IncomingPayloadType.ERROR_RESPONSE, err);
      delete self.outstandingRequests[id];
    }
  });
};

/**
 * Export the module
 */
module.exports = Proxy;
