/**
 * @fileoverview Veyron Runtime
 */

var Server = require('../ipc/server');
var ServerRouter = require('../ipc/server_router');
var Client = require('../ipc/client');
var MessageType = require('../proxy/message_type');
var Namespace = require('../namespace/namespace');
var Principal = require('../security/principal');
var Blessings = require('../security/blessings');
var Deferred = require('../lib/deferred');
var SimpleHandler = require('../proxy/simple_handler');
var context = require('./context');


module.exports = Runtime;

function Runtime(options) {
  if (!(this instanceof Runtime)) {
    return new Runtime(options);
  }

  this.accountName = options.accountName;
  this._wspr = options.wspr;
  this.principal = new Principal(this._getProxyConnection());
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
 * @param {Context} A context.
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
Runtime.prototype.bindTo = function(ctx, name, optServiceSignature, cb) {
  var runtime = this;
  var client = this._getClient();

  var args = context.optionalContext(arguments);
  ctx = args[0], name = args[1], optServiceSignature = args[2], cb = args[3];

  if (typeof optServiceSignature === 'function') {
    cb = optServiceSignature;
    optServiceSignature = undefined;
  }

  if (cb) {
    cb = cb.bind(runtime);
  }

  return client.bindTo(ctx, name, optServiceSignature, cb);
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
 * Calls serve on the default server instance.
 * @see Server#serve
 */
Runtime.prototype.serve = function(name, serviceObject, options, cb) {
  var server = this._getServer();
  return server.serve(name, serviceObject, options, cb);
};


/**
 * Calls serveDispatcher on the default server instance.
 * @see Server#serveDispatcher
 */
Runtime.prototype.serveDispatcher = function(name, dispatcher, cb) {
  var server = this._getServer();
  return server.serveDispatcher(name, dispatcher, cb);
};

/**
 * Calls addName on the default server instance.
 * @see Server#addName
 */
Runtime.prototype.addName = function(name, cb) {
  return this._getServer().addName(name, cb);
};

/**
 * Calls removeName on the default server instance.
 * @see Server#removeName
 */
Runtime.prototype.removeName = function(name, cb) {
  return this._getServer().removeName(name, cb);
};

/**
 * Calls stop on the default server instance.
 * @see Server#stop
 */
Runtime.prototype.stop = function(cb) {
  return this._getServer().stop(cb);
};

/**
 * Creates a new server instance.
 *
 * Although runtime comes with a default server instance that methods such as
 * runtime.serve(), runtime.stop(), etc... operate on, a new server instance
 * can also be created using this newServer() method.
 * @see Server
 * @return {Server} A server instance.
 */
Runtime.prototype.newServer = function() {
  return new Server(this._getRouter());
};

/**
 * Adds an IDL file to the set of definitions known by the server.
 * Services defined in IDL files passed into this method can be used to
 * describe the interface exported by a serviceObject passed into register.
 * @param {object} updates the output of the vdl tool on an idl.
 */
Runtime.prototype.addIDL = function(updates) {
  var server = this._getServer();
  return server.addIDL(updates);
};

/**
 * Returns the pre-configured Namespace that is created
 * when the Runtime is initialized.
 * @return {Namespace} A namespace client instance.
 */
Runtime.prototype.namespace = function() {
  this._ns = this._ns || new Namespace(this._getProxyConnection());
  return this._ns;
};

/**
 * TODO(bjornick): This should probably produce a Principal and not Blessings,
 * but we don't have Principal store yet. This is mostly used for tests anyway.
 * Create new Blessings
 * @param {String} extension Extension for the Blessings .
 * @param {function} [cb] If provided a callback that will be called with the
 * new Blessings.
 * @return {Promise} A promise that resolves to the new Blessings
 */
Runtime.prototype.newBlessings = function(extension, cb) {
  var newBlessingsDef = new Deferred(cb);
  var messageDef = new Deferred();
  var proxy = this._getProxyConnection();
  var id = proxy.nextId();
  var handler = new SimpleHandler(messageDef, proxy, id);

  proxy.sendRequest(JSON.stringify(extension), MessageType.NEW_BLESSINGS,
                    handler, id);

  messageDef.promise.then(function(message) {
    var id = new Blessings(message.handle, message.publicKey, proxy);
    newBlessingsDef.resolve(id);
  }, newBlessingsDef.reject);

  return newBlessingsDef.promise;
};

/**
 * Get or creates a new proxy connection
 * @return {ProxyConnection} A proxy connection
 */
Runtime.prototype._getProxyConnection = function() {
  if (this._proxyConnection) {
    return this._proxyConnection;
  }

  var ProxyConnection;
  if (this._wspr) {
    ProxyConnection = require('../proxy/websocket');
    this._proxyConnection = new ProxyConnection(this._wspr);
  } else {
    ProxyConnection = require('../proxy/nacl');
    this._proxyConnection = new ProxyConnection();
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
