// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @private
 * @fileoverview WebSocket client implementation
 */

var isBrowser = require('is-browser');
var WebSocket = require('ws');

var Deferred = require('./../lib/deferred');
var TaskSequence = require('./../lib/task-sequence');
var Proxy = require('./index');
var vlog = require('./../lib/vlog');

/**
 * A client for the vanadium service using websockets. Connects to the vanadium
 * wspr and performs RPCs.
 * @constructor
 * @private
 * @param {string} url of wspr that connects to the vanadium network
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
  var proxy = this;
  this.getWebSocket().then(function success() {
    def.resolve(proxy);
  }, def.reject);
  this._tasks = new TaskSequence();
}

ProxyConnection.prototype = Object.create(Proxy.prototype);

ProxyConnection.prototype.constructor = ProxyConnection;

/**
 * Connects to the server and returns an open web socket connection
 * @private
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
    vlog.logger.info('Connected to wspr at', self.url);
    deferred.resolve(websocket);
  };
  websocket.onerror = function(e) {
    var isEvent = isBrowser && !!window.Event && e instanceof window.Event;
    var isErrorEvent = isEvent && e.type === 'error';

    // It's possible to get a DOM WebSocket error event here, which is not an
    // actual Error object, so we must turn it into one.
    if (isErrorEvent) {
      e = new Error('WebSocket error.');
    }

    // Add a more descriptive message to the error.
    // TODO(jasoncampbell): there can be more errors than just failed
    // connection, additionally there can be more than one error emitted. We
    // should take care to cover these cases.
    e.message = 'Failed to connect to wspr at url ' + self.url +
        ': ' + e.message;

    vlog.logger.error(e);
    deferred.reject(e);
  };

  websocket.onmessage = function(frame) {
    self.process(frame.data);
  };

  return deferred.promise;
};

ProxyConnection.prototype.send = function(msg) {
  this.getWebSocket().then(function(ws) {
    ws.send(JSON.stringify(msg));
  }).catch(function(err) {
    throw err;
  });
};

ProxyConnection.prototype.close = function(cb) {
  var deferred = new Deferred(cb);
  this.cleanup();

  this.getWebSocket().then(close, function(err) {
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
