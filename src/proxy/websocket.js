/**
 * @fileoverview WebSocket client implementation
 */

'use strict';

var WebSocket = require('./../lib/websocket');
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

/**
 * Export the module
 */
module.exports = ProxyConnection;
