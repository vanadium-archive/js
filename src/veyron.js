/**
 *  @fileoverview Public API and entry point to the Veyron API
 */

'use strict';

var Environment = require('./environment/environment');
var ProxyConnection = require('./proxy/connection');
var Server = require('./ipc/server');
var Client = require('./ipc/client');
var Deferred = require('./lib/deferred');
var Promise = require('./lib/promise');

/**
 * Veyron constructor.
 * @constructor
 * @param {Object} config Configuration options
 */
function Veyron(config) {

  //TODO(aghassemi) Have default config and have these override those.
  config = config || {};
  config.proxy = config.proxy || 'vonery.com:8125';

  this._config = config;
}

/**
 * A Veyron server allows registration of services that can be
 * invoked remotely via RPCs.
 *
 * Usage:
 * var videoService = {
 *   play: {
 *     // Play video
 *   }
 * };
 *
 * var s = veyron.newServer();
 * s.register('video', videoService);
 * s.publish('mymedia');
 * @return {Object} A server object
 */
Veyron.prototype.newServer = function() {
  // We can not cache proxy connection for servers since each proxy connection
  // can only be tied to a single server
  var proxyConnection = this._newProxyConnection();
  return new Server(proxyConnection);
};

/**
 * A Veyron client allows binding to remote services to invoke methods visa RPCs
 *
 * Usage:
 * var cl = veyron.newClient();
 * var service = cl.bind('EndpointAddress', 'ServiceName', {
 *   'ServiceName' : {
 *      'MethodName' : {
 *          name: 'MethodName',
 *          numParams: 1,
            numOutParams: 1
 *      }
 *    }
 *  });
 * resultPromise = service.MethodName(arg);
 * @return {Object} A client object
 */
Veyron.prototype.newClient = function() {
  // We can cache the proxy used for client
  if (this._proxyForClient === undefined) {
    this._proxyForClient = this._newProxyConnection();
  }
  return new Client(this._proxyForClient);
};

/**
 * Gets the current runtime environment.
 * @return {Environment} Object representing the runtime environment including
 * type ( e.g. Browser, NodeJS ), capabilities and a description.
 */
Veyron.prototype.getEnvironment = function() {
  return Environment;
};

/**
 * Creates a new proxy connection
 * @return {ProxyConnection} A new proxy connection
 */
Veyron.prototype._newProxyConnection = function() {
  return new ProxyConnection(this._config.proxy, 'websocket', null);
};

/**
 * @constructor
 * A lightweight deferred implementation using Veyron.Promise promises
 */
Veyron.Deferred = Deferred;

/**
 * @constructor
 * A EcmaScript6-compatible implementation of Promise/A spec
 */
Veyron.Promise = Promise;

/**
 * Export Veyron
 */
module.exports = Veyron;
