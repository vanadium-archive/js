/**
 *  @fileoverview Public API and entry point to the Veyron API
 */

'use strict';

var ProxyConnection = require('./proxy/websocket');
var Server = require('./ipc/server');
var Client = require('./ipc/client');
var Deferred = require('./lib/deferred');
var Promise = require('./lib/promise');
var vLog = require('./lib/vlog');
var vError = require('./lib/verror');
var http = require('./lib/http');
var Namespace = require('./namespace/namespace');
var store = require('./storage/store');

/**
 * Veyron constructor.
 * @constructor
 * @param {Object} config Configuration options
 */
function Veyron(config) {
  if (!(this instanceof Veyron)) {
    return new Veyron(config);
  }

  //TODO(aghassemi) Have default config and have these override those.
  config = config || {};
  config.proxy = config.proxy || 'vonery.com:8125';
  // TODO(aghassemi) change default to NOLOG before release
  if (typeof config.logLevel === 'undefined' || config.logLevel === null) {
    config.logLevel =  Veyron.logLevels.DEBUG;
  }
  config.identityServer = config.identityServer ||
    'http://www.vonery.com:8125/random/';

  this._config = config;
  vLog.level = config.logLevel;
}

/**
 * A Veyron server allows registration of services that can be
 * invoked remotely via RPCs.
 *
 * Usage:
 * var videoService = {
 *   play: function(videoName) {
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
  return new Server(this._getProxyConnection());
};

/**
 * A Veyron client allows binding to remote services to invoke methods visa RPCs
 *
 * Usage:
 * var cl = veyron.newClient();
 * var service = cl.bindTo('EndpointAddress', 'ServiceName');
 * resultPromise = service.MethodName(arg);
 * @return {Object} A client object
 */
Veyron.prototype.newClient = function() {
  return new Client(this._getProxyConnection());
};

/**
 * Create a Veyron store client to access the store.
 * For usage, @see storage/store.js
 */
Veyron.prototype.newStore = function() {
  return new store.Store(this.newClient());
};

/**
 * Creates a new proxy connection
 * @return {ProxyConnection} A new proxy connection
 */
Veyron.prototype._getProxyConnection = function() {
  if (!this._proxyConnection) {
    this._proxyConnection =
      new ProxyConnection(this._config.proxy, this._getIdentityPromise());
  }
  return this._proxyConnection;
};

Veyron.prototype._getIdentityPromise = function() {
  if (!this._identityPromise) {
    this._identityPromise = http.Request(this._config.identityServer).then(
      function(res) {
        // TODO(bprosnitz) Consider performing validation on the identity.
        return res.body;
      }
    );
  }
  return this._identityPromise;
};

/**
 * Create a new Namespace
 * @return {Promise} A promise that resolves to a Namespace instance.
 */
Veyron.prototype.newNamespace = function(roots) {
  var veyron = this;
  var proxy = this._getProxyConnection();

  if (roots) {
    return Promise.cast(new Namespace(veyron.newClient(), roots));
  }

  // We have to ask for the websocket now, otherwise the config
  // wont arrive until the first time someone tries to make a call
  // which is deadlock prone.
  proxy.getWebSocket();
  return this._getProxyConnection().config.then(function(config) {
    return new Namespace(veyron.newClient(), config.mounttableRoot);
  });
};

// TODO(bprosnitz) Remove this before release!
/**
 * @constructor
 * A lightweight deferred implementation using Veyron.Promise promises
 */
Veyron.Deferred = Deferred;

// TODO(bprosnitz) Remove this before release!
/**
 * @constructor
 * A EcmaScript6-compatible implementation of Promise/A spec
 */
Veyron.Promise = Promise;

/**
 * Enum for different log levels:
 *   NOLOG //No logging
 *   ERROR //Only errors are written
 *   WARN  //Only errors and warnings are written
 *   DEBUG //Errors, warnings and debug messages are written
 *   INFO  //All logs are written,
 * @readonly
 * @enum {number}
 */
Veyron.logLevels = vLog.levels;

/**
 * Errors exposes a group of constructor functions to easily make common
 * Error objects with predefined names.
 */
Veyron.Errors = vError;

/**
 * Transaction is a constructor for a new store transaction.
 */
Veyron.Transaction = store.Transaction;

/**
 * Export Veyron
 */
module.exports = Veyron;
