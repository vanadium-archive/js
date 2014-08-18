/**
 * @fileoverview Veyron Runtime
 */

var Server = require('../ipc/server');
var ServerRouter = require('../ipc/server_router');
var Client = require('../ipc/client');
var ProxyConnection = require('../proxy/websocket');
var Promise = require('es6-promise').Promise;
var Namespace = require('../namespace/namespace');
var namespaceUtil = require('../namespace/util');
var store = require('../storage/store');
var vLog = require('../lib/vlog');
var watch = require('../watch/watch');

module.exports = Runtime;

function Runtime(options) {
  if (!(this instanceof Runtime)) {
    return new Runtime(options);
  }

  options.proxy = options.proxy || 'vonery.com:8125';

  // TODO(aghassemi) change default to NOLOG before release
  if (typeof options.logLevel === 'undefined' || options.logLevel === null) {
    options.logLevel =  vLog.levels.DEBUG;
  }
  this._options = options;
  vLog.level = options.logLevel;

}

/**
 * Performs client side binding of a remote service to a native javascript
 * stub object.
 *
 * Usage:
 * var service = runtime.bindTo('EndpointAddress', 'ServiceName')
 * var resultPromise = service.MethodName(arg);
 *
 * @param {string} name the veyron name of the service to bind to.
 * @param {object} optServiceSignature if set, javascript signature of methods
 * available in the remote service.
 * @param {function} [callback] if given, this function will be called on
 * completion of the bind.  The first argument will be an error if there is
 * one, and the second argument is an object with methods that perform rpcs to
 * service
 * methods.
 * @return {Promise} An object with methods that perform rpcs to service methods
 *
 */
Runtime.prototype.bindTo = function(name, optServiceSignature, callback) {
  var client = this._getClient();
  return client.bindTo(name, optServiceSignature, callback);
};

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
 * var service = runtime.serve('mymedia/video', videoService)
 *
 * @param {string} name Name to serve under
 * @param {Object} serviceObject service object to serve
 * @param {*} serviceMetadata if provided a set of metadata for functions
 * in the service (such as number of return values).  It could either be
 * passed in as a properties object or a string that is the name of a
 * service that was defined in the idl files that the server knows about.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails
 * the endpoint address of the server will be returned as the value of promise
 */
Runtime.prototype.serve = function(name, serviceObject, serviceMetadata,
    callback) {
  var server = this._getServer();
  return server.serve(name, serviceObject, serviceMetadata, callback);
};

/**
 * addIDL adds an IDL file to the set of definitions known by the server.
 * Services defined in IDL files passed into this method can be used to
 * describe the interface exported by a serviceObject passed into register.
 * @param {object} updates the output of the vdl tool on an idl.
 */
Runtime.prototype.addIDL = function(updates) {
  var server = this._getServer();
  return server.addIDL(updates);
};

/**
 * Get or creates a new proxy connection
 * @return {ProxyConnection} A proxy connection
 */
Runtime.prototype._getProxyConnection = function() {
  if (!this._proxyConnection) {
    this._proxyConnection = new ProxyConnection(this._options.proxy);
  }
  return this._proxyConnection;
};

/**
 * Get or creates a router
 * @return {ServerRouter} A router
 */
Runtime.prototype._getRouter = function() {
  if (!this._router) {
    this._router = new ServerRouter(
        this._getProxyConnection());
  }
  return this._router;
};


/**
 * Get or creates a client
 * @return {Client} A client
 */
Runtime.prototype._getClient = function() {
  this._client = this._client || new Client(this._getProxyConnection());
  return this._client;
};

/**
 * Get or creates a server
 * @return {Server} A server
 */
Runtime.prototype._getServer = function() {
  this._server = this._server || new Server(this._getRouter());
  return this._server;
};

/**
 * Create a Veyron store client to access the store.
 * For usage, @see storage/store.js
 */
Runtime.prototype.newStore = function() {
  return new store.Store(this._getClient());
};

/**
 * Create a new Namespace
 * @return {Promise} A promise that resolves to a Namespace instance.
 */
Runtime.prototype.newNamespace = function(roots) {
  var rt = this;
  var proxy = this._getProxyConnection();

  if (roots) {
    return Promise.resolve(new Namespace(this._getClient(), roots));
  }

  // We have to ask for the websocket now, otherwise the config
  // wont arrive until the first time someone tries to make a call
  // which is deadlock prone.
  proxy.getWebSocket();
  return proxy.config.then(function(config) {
    return new Namespace(rt._getClient(), config.mounttableRoot);
  });
};

/**
 * Utility functions to manipulate veyron names
 */
Runtime.namespaceUtil = namespaceUtil;

/**
 * Transaction is a constructor for a new store transaction.
 */
Runtime.Transaction = store.Transaction;

/**
 * Watch is a constructor for a new Watch.
 */
Runtime.Watch = watch;
