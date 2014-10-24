/**
 * @fileoverview Veyron Runtime
 */

var Server = require('../ipc/server');
var ServerRouter = require('../ipc/server_router');
var Client = require('../ipc/client');
var ProxyConnection = require('../proxy/websocket');
var MessageType = require('../proxy/message_type');
var Namespace = require('../namespace/namespace');
var PrivateId = require('../security/private');
var PublicId = require('../security/public');
var Deferred = require('../lib/deferred');
var SimpleHandler = require('../proxy/simple_handler');

module.exports = Runtime;

function Runtime(options) {
  if (!(this instanceof Runtime)) {
    return new Runtime(options);
  }

  this.identityName = options.identityName;
  this._wspr = options.wspr;
  this.identity = new PrivateId(this._getProxyConnection());
  this._name = options.appName;
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
 * @param {function} [cb] if given, this function will be called on
 * completion of the bind.  The first argument will be an error if there is
 * one, and the second argument is an object with methods that perform rpcs to
 * service
 * methods.
 * @return {Promise} An object with methods that perform rpcs to service methods
 *
 */
Runtime.prototype.bindTo = function(name, optServiceSignature, cb) {
  var runtime = this;
  var client = this._getClient();

  if (typeof optServiceSignature === 'function') {
    cb = optServiceSignature;
    optServiceSignature = undefined;
  }

  if (cb) {
    cb = cb.bind(runtime);
  }

  return client.bindTo(name, optServiceSignature, cb);
};

/**
 * Closes the underlying websocket connection.
 *
 * @example
 *
 * runtime.close(function(err, code, message){
 *   if (err) throw err;
 *   console.log('code: %s, message: %s', code, message)
 * });
 *
 * @param {Function} [cb] - Gets called once the underlying
 * websocket is closed. Arguments: error, code, message.
 *
 * @see {@link http://goo.gl/6nC1xs|WS Event: "close"}
 *
 */
Runtime.prototype.close = function(cb) {
  var runtime = this;

  return runtime
  ._getProxyConnection()
  .close(cb);
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
 * @param {function} cb if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails
 * the endpoint address of the server will be returned as the value of promise
 */
Runtime.prototype.serve = function(name, serviceObject, serviceMetadata, cb) {
  var server = this._getServer();
  return server.serve(name, serviceObject, serviceMetadata, cb);
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
    this._proxyConnection = new ProxyConnection(this._wspr);
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
        this._getProxyConnection(),
        this._name);
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
 * Create a new Namespace.
 * @param {string[]} Optional root names.
 * @return {Namespace} A namespace client instance.
 * TODO(aghassemi) rename back to newNamespace
 */
Runtime.prototype.newNamespace = function(roots) {
  var proxy = this._getProxyConnection();
  return new Namespace(proxy, roots);
};

/**
 * TODO(bjornick): This should probably produce a PrivateId and not a PublicId,
 * but we don't have PrivateId store yet. This is mostly used for tests anyway.
 * Create a new Identity
 * @param {String} name the name for the identity.
 * @param {function} cb if provided a callback that will be called with the
 * new publicId.
 * @return {Promise} A promise that resolves to the new PublicId
 */
Runtime.prototype.newIdentity = function(name, cb) {
  var newIdentityDef = new Deferred(cb);
  var messageDef = new Deferred();
  var proxy = this._getProxyConnection();
  var id = proxy.nextId();
  var handler = new SimpleHandler(messageDef, proxy, id);

  proxy.sendRequest(JSON.stringify(name), MessageType.NEW_ID, handler, id);

  messageDef.promise.then(function(message) {
    var id = new PublicId(message.names, message.handle, message.publicKey,
                          proxy);

    newIdentityDef.resolve(id);
  }, newIdentityDef.reject);

  return newIdentityDef.promise;
};
