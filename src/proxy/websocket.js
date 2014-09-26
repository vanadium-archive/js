/**
 * @fileoverview WebSocket client implementation
 */

var WebSocket = require('ws');
var Deferred = require('./../lib/deferred');
var vLog = require('./../lib/vlog');
var Proxy = require('./proxy');

/**
 * A client for the veyron service using websockets. Connects to the veyron wspr
 * and performs RPCs.
 * @constructor
 * @param {string} url of wspr that connects to the veyron network
 * identity
 */
function ProxyConnection(url) {
  this.url = url.replace(/^(http|https)/, 'ws') + '/ws';
  this.currentWebSocketPromise = null;
  // Since we haven't finished constructing the Proxy object,
  // we can't call this.getWebsocket() to return the sender promise.
  // Instead, we create a new promise that will eventually call
  // getWebsocket and only resolve the promise after Proxy.call
  // has completed.
  var def = new Deferred();
  Proxy.call(this, def.promise);
  def.resolve(this.getWebSocket());
}

ProxyConnection.prototype = Object.create(Proxy.prototype);

ProxyConnection.prototype.constructor = ProxyConnection;

/**
 * Connects to the server and returns an open web socket connection
 * @return {promise} a promise that will be fulfilled with a websocket object
 * when the connection is established.
 */
ProxyConnection.prototype.getWebSocket = function() {
  // We are either connecting or already connected, return the same promise
  if (this.currentWebSocketPromise) {
    return this.currentWebSocketPromise;
  }

  // TODO(bjornick): Implement a timeout mechanism.
  var websocket = new WebSocket(this.url);
  var self = this;
  var deferred = new Deferred();
  this.currentWebSocketPromise = deferred.promise;
  websocket.onopen = function() {
    vLog.info('Connected to proxy at', self.url);
    deferred.resolve(websocket);
  };
  var configDeferred = this._configDeferred;
  websocket.onerror = function(e) {
    vLog.error('Failed to connect to proxy at url:', self.url);
    deferred.reject(e);

    // TODO(nlacasse): This causes an unhandledRejection, since nothing is
    // chained on this promise at the point when we reject it.
    //
    // Later on, configDeferred becomes proxy.config, and a lot of places in the
    // code do proxy.config.then(), so I'm leaving this in for now.
    //
    // This should be refactored so that there is a handler chained to this
    // promise at the point it is created, or at least before it gets rejected.
    configDeferred.reject(
      'Proxy connection closed, failed to get config ' + e);
  };

  websocket.onmessage = function(frame) {
    var message;
    try {
      message = JSON.parse(frame.data);
    } catch (e) {
      vLog.warn('Failed to parse ' + frame.data);
      return;
    }

    self.process(message);
  };

  return deferred.promise;
};

ProxyConnection.prototype.close = function(cb) {
  var proxy = this;
  var deferred = new Deferred(cb);

  proxy
  .getWebSocket()
  .then(close, function(err) {
    // TODO(jasoncampbell): Better error handling around websocket connection
    // It's possible that the initial connection failed with
    // "Error: getaddrinfo ENOTFOUND" Since there was not a
    // connection to begin with in this case it can be considered
    // successfully closed.
    deferred.resolve();
  });

  return deferred.promise;

  function close(websocket) {
    websocket.onclose = deferred.resolve;
    websocket.close();
  }
};

/**
 * Export the module
 */
module.exports = ProxyConnection;
