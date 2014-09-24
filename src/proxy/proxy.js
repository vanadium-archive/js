/**
 * @fileoverview An object that handles marshaling and unmarshal
 * messages from the native veyron implementation.
 */

var MessageType = require('./message_type');
var IncomingPayloadType = require('./incoming_payload_type');
var Deferred = require('./../lib/deferred');
var Promise = require('../lib/promise');
var vLog = require('./../lib/vlog');
var SimpleHandler = require('./simple_handler');

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
  this._hasResolvedConfig = false;
  this._configDeferred = new Deferred();
  this.config = this._configDeferred.promise;
  this.senderPromise = sender;
  this.incomingRequestHandlers = {};
}

/**
 * Handles a message from native veyron implementation.
 * @param {Object} messsage The message from the native veyron code.
 */
Proxy.prototype.process = function(message) {
  if (this._hasResolvedConfig === false) { // first message is the config.
    this._hasResolvedConfig = true;
    this._configDeferred.resolve(message);
    return;
  }

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
      vLog.warn('Dropping message for unknown invoke payload ' + payload.type);
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
 * @param {string} name the veyron name of the service to get signature for.
 * @return {Promise} Signature of the service in JSON format
 */
Proxy.prototype.getServiceSignature = function(name) {
  var cachedEntry = this.bindCache[name];
  var now = new Date();
  if (cachedEntry && now - cachedEntry.fetched < BIND_CACHE_TTL) {
    return Promise.resolve(cachedEntry.signature);
  }

  var def = new Deferred();

  var self = this;
  def.promise.then(function(signature) {
    self.bindCache[name] = {
      signature: signature,
      fetched: now
    };
  });
  var messageJSON = { name: name };
  var message = JSON.stringify(messageJSON);

  var id = this.nextId();
  // Send the get signature request to the proxy
  var handler = new SimpleHandler(def, this, id);
  this.sendRequest(message, MessageType.SIGNATURE, handler, id);

  return def.promise;
};


Proxy.prototype.addIncomingHandler = function(type, handler) {
  this.incomingRequestHandlers[type] = handler;
};

Proxy.prototype.addIncomingStreamHandler = function(id, handler) {
  this.outstandingRequests[id] = handler;
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
  }).catch(function(e) {
    var h = self.outstandingRequests[id];
    if (h) {
      h.handleResponse(IncomingPayloadType.ERROR_RESPONSE, e);
      delete self.outstandingRequests[id];
    }
  });
};

/**
 * Export the module
 */
module.exports = Proxy;
