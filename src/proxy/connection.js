/**
 * @fileoverview WebSocket client implementation
 */

'use strict';

var WebSocket = require('./websocket');
var Deferred = require('./../lib/deferred');
var Promise = require('./../lib/promise');
var vLog = require('./../lib/vlog');
var IdlHelper = require('./../idl/idl');
var ServiceWrapper = IdlHelper.ServiceWrapper;

var MessageType = {
  REQUEST: 0, // Request to invoke a method on a Veyron name
  PUBLISH: 1, // Request to publish a server in JavaScript under a Veyron name
  REGISTER: 2, // Request to register a service in JavaScript under a prefix
  RESPONSE: 3, // Indicates a response from a registered service in JavaScript
  STREAM_VALUE: 4, // Indicates a stream value
  STREAM_CLOSE: 5, // Request to close a stream
  SIGNATURE: 6 // Request to get signature of a remote server
};

var IncomingPayloadType = {
  FINAL_RESPONSE: 0, // Final response to a call originating from JS
  STREAM_RESPONSE: 1, // Stream response to a call originating from JS
  ERROR_RESPONSE: 2, // Error response to a call originating from JS
  INVOKE_REQUEST: 3, // Request to invoke a method in JS originating from server
  STREAM_CLOSE: 4  // Response saying that the stream is closed.
};

/**
 * A client for the veyron service using websockets. Connects to the veyron HTTP
 * proxy and performs RPCs.
 * @constructor
 * @param {string} url of the http proxy that connects to the veyron network
 * @param {string} [ privateIdentity = null ] private key for the user's veyron
 * identity
 */
function VeyronWSClient(url, privateIdentity) {
  this.url = url.replace(/^(http|https)/, 'ws') + '/ws';
  this.privateIdentity = privateIdentity;
  // We use odd numbers for the message ids, so that the server can use even
  // numbers.
  this.id = 1;
  this.outstandingRequests = {};
  this.currentWebSocketPromise;
  this.registeredServices = {};
}

function getDeferred() {
  return new Deferred();
}

/**
 * Connects to the server and returns an open web socket connection
 * @return {promise} a promise that will be fulfilled with a websocket object
 * when the connection is established.
 */
VeyronWSClient.prototype.getWebSocket = function() {

  // We are either connecting or already connected, return the same promise
  if (this.currentWebSocketPromise) {
    return this.currentWebSocketPromise;
  }

  // TODO(bjornick): Implement a timeout mechanism.
  var websocket = new WebSocket(this.url);
  var self = this;
  var deferred = getDeferred();
  this.currentWebSocketPromise = deferred.promise;
  websocket.onopen = function() {
    vLog.info('Connected to proxy at', self.url);
    deferred.resolve(websocket);
  };

  websocket.onerror = function(e) {
    vLog.error('Failed to connect to proxy at url:', self.url);
    deferred.reject(e);
  };

  websocket.onmessage = function(frame) {
    var message;
    try {
      message = JSON.parse(frame.data);
    } catch (e) {
      vLog.warn('Failed to parse ' + frame.data);
      return;
    }

    // Messages originating from server are even numbers
    var isServerOriginatedMessage = (message.ID % 2) === 0;

    var def = self.outstandingRequests[message.ID];
    var payload;
    try {
      payload = JSON.parse(message.Data);
    } catch (e) {
      if (!isServerOriginatedMessage) {
        def.reject(message.Data);
        delete self.outstandingRequests[message.ID];
      }
      return;
    }

    // If we don't know about this flow, just drop the message. Unless it
    // originated from the sever.
    if (!isServerOriginatedMessage && !def) {
      vLog.info('Dropping message for unknown flow ' + message.ID + ' ' +
          message.Data);
      return;
    }

    switch (payload.Type) {
      case IncomingPayloadType.FINAL_RESPONSE:
        if (payload.Message.length === 1) {
          payload.Message = payload.Message[0];
        }
        def.resolve(payload.Message);
        break;
      case IncomingPayloadType.STREAM_RESPONSE:
        try {
          if (def.onmessage) {
            def.onmessage(payload.Message);
          }
          return;
          // Return so we don't remove the promise from the queue.
        } catch (e) {
          def.reject(e);
        }
        break;
      case IncomingPayloadType.ERROR_RESPONSE:
        def.reject(payload.Message);
        break;
      case IncomingPayloadType.INVOKE_REQUEST:
        self.handleIncomingInvokeRequest(message.ID, payload.Message);
        return;
      case IncomingPayloadType.STREAM_CLOSE:
        def.resolve();
        return;
      default:
        def.reject(new Error('Received unknown response type from http proxy'));
    }
    delete self.outstandingRequests[message.ID];
  };

  return deferred.promise;
};

/**
 * A stream that allows sending and recieving data for a streaming rpc.  If
 * onmessage is set and a function, it will be called whenever there is data on.
 * the stream. The stream implements the promise api.  When the rpc is complete,
 * the stream will be fulfilled.  If there is an error, then the stream will be
 * rejected.
 * @constructor
 *
 * @param {number} flowId flow id
 * @param {Promise} webSocketPromise Promise of a websocket connection when
 * it's established
 */
var Stream = function(flowId, webSocketPromise) {
  // Call the deferred constructor.
  Deferred.call(this);
  this.flowId = flowId;
  this.webSocketPromise = webSocketPromise;
  this.onmessage = null;
};

Stream.prototype = Object.create(Deferred.prototype);

/**
 * Send data down the stream
 * @param {*} data the data to send to the other side.
 */
Stream.prototype.send = function(data) {
  var flowId = this.flowId;
  this.webSocketPromise.then(function(websocket) {
    websocket.send(JSON.stringify({
      id: flowId,
      data: JSON.stringify(data),
      type: MessageType.STREAM_VALUE
    }));
  });
};

/**
 * Closes the stream, telling the other side that there is no more data.
 */
Stream.prototype.close = function() {
  var flowId = this.flowId;
  this.webSocketPromise.then(function(websocket) {
    websocket.send(JSON.stringify({
      id: flowId,
      type: MessageType.STREAM_CLOSE
    }));
  });
};

/**
 * Invoke a veyron method via rpc.
 * @param {string} name object name.
 * @param {string} methodName the name of the method to invoke
 * @param {object} [ mapOfArgs = {} ] key-value map of argument names to values
 * @param {number} numOutArgs Number of expected outputs by the method
 * @param {boolean} isStreaming true if this rpc is streaming.
 * @return {promise} a promise to a return argument key value map
 * (for multiple return arguments)
 */
VeyronWSClient.prototype.promiseInvokeMethod = function(name,
    methodName, mapOfArgs, numOutArgs, isStreaming) {
  var message = this.constructMessage(name,
      methodName, mapOfArgs, numOutArgs, isStreaming,
      this.privateIdentity);

  var def = getDeferred();
  var promise = def.promise;

  if (isStreaming) {
    var stream = new Stream(this.id, this.getWebSocket());
    def.resolve(stream);
    def = stream;
  }

  this.sendRequest(message, MessageType.REQUEST, def);

  return promise;
};

/**
 * Establishes the connection if needed, frames the message with the next id,
 * adds the given deferred to outstanding requests queue and sends the request
 * to the server
 * @param {Object} message Message to send
 * @param {MessageType} type Type of message to send
 * @param {Deferred} def Deferred to add to outstandingRequests
 */
VeyronWSClient.prototype.sendRequest = function(message, type, def) {

  this.outstandingRequests[this.id] = def;

  var body = JSON.stringify({ id: this.id, data: message, type: type });

  this.getWebSocket().then(function(websocket) {
    websocket.send(body);
  },function(e) {
    def.reject(e);
  });

  this.id += 2;
};

/**
 * Handles incoming requests from the server to invoke methods on registered
 * services in JavaScript.
 * @param {string} messageId Message Id set by the server.
 * @param {Object} request Invocation request JSON. Request's structure is
 * {
 *   'Name': string // Name under which the service is registered
 *   'Method': string // Name of the method on the service to call
 *   'Args': [] // Array of positional arguments to be passed into the method
 * }
 */
VeyronWSClient.prototype.handleIncomingInvokeRequest = function(messageId,
    request) {

  var self = this;
  var err;

  // Find the service
  var serviceWrapper = this.registeredServices[request.Name];
  if (serviceWrapper === undefined) {
    err = new Error('No registered service found for ' + request.Name);
    this.sendInvokeRequestResult(messageId, null, err);
    return;
  }

  var serviceObject = serviceWrapper.object;

  // Find the method
  var serviceMethod = serviceObject[request.Method];
  if (serviceMethod === undefined) {
    err = new Error('Requested method ' + request.Method +
        ' not found on the service registered under ' + request.Name);
    this.sendInvokeRequestResult(messageId, null, err);
    return;
  }
  var metadata = serviceWrapper.metadata[request.Method];

  // Invoke the method
  try {
    var args = request.Args;
    var streamingPosition = metadata.injections['$stream'];
    if (streamingPosition !== undefined) {
      var stream = new Stream(messageId, this.getWebSocket());
      self.outstandingRequests[messageId] = stream;
      args.splice(streamingPosition, 0, stream);
    }
    // Call the registered method on the requested service
    // TODO(aghassemi) Context injection for special arguments like $PATH
    var result = serviceMethod.apply(serviceObject, args);

    // Normalize result to be a promise
    var resultPromise = Promise.cast(result);

    // Send the result back to the server
    resultPromise.then(function(value) {
      self.sendInvokeRequestResult(messageId, value, null);
    }, function(err) {
      self.sendInvokeRequestResult(messageId, null, err);
    });
  } catch (e) {
    // Frame any exceptions from method invocation
    err = new Error('Requested method ' + request.Method +
        ' threw an exception on invoke' + e);
    self.sendInvokeRequestResult(messageId, null, err);
  }
};

/**
 * Sends the result of a requested invocation back to the http proxy
 * @param {string} messageId Message id of the original invocation request
 * @param {Object} value Result of the call
 * @param {Object} error Error from the call
 */
VeyronWSClient.prototype.sendInvokeRequestResult = function(messageId, value,
    error) {

  // JavaScript functions always return one result even if null or undefined
  var results = [value];

  var responseData = {
    'Results' : results,
    'Err' : (error !== null) ? error + '' : null // Stringify the error
  };

  var responseDataJSON = JSON.stringify(responseData);

  var body = JSON.stringify({ id: messageId,
    data: responseDataJSON,
    type: MessageType.RESPONSE });

  this.getWebSocket().then(function(websocket) {
    websocket.send(body);
  });
  delete this.outstandingRequests[messageId];
};

/**
 * Registers a service object under a prefix name
 * @param {string} name The name to register the service under
 * @param {Object} serviceObj service object.
 * @return {Promise} Promise to be called when register completes or fails
 */
VeyronWSClient.prototype.registerService = function(name, serviceObj) {
  //TODO(aghassemi) Handle registering after publishing

  var def = getDeferred();

  if (this.registeredServices[name] !== undefined) {
    var err = new Error('Service already registered under name: ' + name);
    def.reject(err);
  } else {
    this.registeredServices[name] = new ServiceWrapper(serviceObj);
    def.resolve();
  }

  return def.promise;
};

/**
 * Publishes the server under a name
 * @param {string} name Name to publish under
 * @return {Promise} Promise to be called when publish completes or fails
 * the endpoint string of the server will be returned as the value of promise
 */
VeyronWSClient.prototype.publishServer = function(name) {
  //TODO(aghassemi) Handle publish under multiple names

  vLog.info('Publishing a server under name: ', name);

  // Generate IDL for the registered services
  var idl = this.generateIdlWireDescription();

  var messageJSON = {
    'Name': name,
    'Services': idl
  };

  var def = getDeferred();
  var message = JSON.stringify(messageJSON);
  // Send the publish request to the proxy
  this.sendRequest(message, MessageType.PUBLISH, def);

  return def.promise;
};

/**
 * Gets the signature including methods names, number of arguments for a given
 * service name.
 * @param {string} name the veyron name of the service to get signature for.
 * @return {Promise} Signature of the service in JSON format
 */
VeyronWSClient.prototype.getServiceSignature = function(name) {

  var messageJSON = {
    'Name': name,
    'PrivateID': this.privateIdentity
  };

  var def = getDeferred();
  var message = JSON.stringify(messageJSON);
  // Send the get signature request to the proxy
  this.sendRequest(message, MessageType.SIGNATURE, def);

  return def.promise;
};

/**
 * Generates an IDL wire description for all the registered services
 * @return {object} map from service name to idl wire description
 */
VeyronWSClient.prototype.generateIdlWireDescription = function() {
  var servicesIdlWire = {};

  for (var serviceName in this.registeredServices) {
    if (this.registeredServices.hasOwnProperty(serviceName)) {
      var serviceMetadata = this.registeredServices[serviceName];
      servicesIdlWire[serviceName] =
          IdlHelper.generateIdlWireDescription(serviceMetadata);
    }
  }

  return servicesIdlWire;
};

/**
 * Construct a message to send to the veyron http proxy.
 * @param {string} name veyron name.
 * @param {string} methodName the name of the method to invoke.
 * @param {object} [ mapOfArgs = {} ] key-value map of argument names to values
 * @param {number} numOutArgs Number of expected outputs by the method
 * @param {boolean} isStreaming
 * @param {string} privateIdentity The private identity
 * @return {string} json string to send to the http proxy
 */
VeyronWSClient.prototype.constructMessage = function(name, methodName,
    mapOfArgs, numOutArgs, isStreaming, privateIdentity) {
  var jsonMessage = {
    'Name' : name,
    'Method' : methodName,
    'InArgs' : mapOfArgs || {},
    'NumOutArgs' : numOutArgs || 0,
    'IsStreaming' : isStreaming,
    'PrivateID' : privateIdentity || null
  };
  return JSON.stringify(jsonMessage);
};

/**
 * Export the module
 */
module.exports = VeyronWSClient;
