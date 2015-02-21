/**
 * @fileoverview Veyron Runtime
 * @private
 */
var EE = require('eventemitter2').EventEmitter2;
var inherits = require('inherits');
var Server = require('../ipc/server');
var ServerRouter = require('../ipc/server-router');
var Client = require('../ipc/client');
var Namespace = require('../namespace');
var CaveatValidatorRegistry = require('../security/caveat-validator-registry');
var Principal = require('../security/principal');
var Blessings = require('../security/blessings');
var Deferred = require('../lib/deferred');
var vlog = require('../lib/vlog');
var context = require('./context');
var SharedContextKeys = require('./shared-context-keys');
var vtrace = require('../lib/vtrace');
var Controller =
  require('../v.io/wspr/veyron/services/wsprd/app').Controller;

module.exports = Runtime;

/*
 * Vanadium runtime.
 * Runtime exposes entry points to create servers, client, blessing and other
 * parts of the Vanadium functionality.
 *
 * Runtime is also an EventEmitter:
 *    Event: 'crash'
 *    Emitted when the runtime crashes in an unexpected way. Recovery from
 *    crash event requires restarting the application.
 */
function Runtime(options) {
  if (!(this instanceof Runtime)) {
    return new Runtime(options);
  }

  EE.call(this);

  this.accountName = options.accountName;
  this._wspr = options.wspr;
  var client = this.newClient();
  this._controller = client.bindWithSignature(
    '__controller', [Controller.prototype._serviceDescription]);
  this.principal = new Principal(this.getContext(), this._controller);
  this._name = options.appName;
  this._language = options.language;
  this.caveatRegistry = new CaveatValidatorRegistry();
}

inherits(Runtime, EE);

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
 * Creates a new client instance.
 *
 * Although runtime comes with a default client instance that methods such as
 * runtime.bindTo() operate on, a new client instance can also be created using
 * this newClient() method.
 * @see Client
 * @return {Client} A Client instance.
 */
Runtime.prototype.newClient = function() {
  return new Client(this._getProxyConnection());
};

/**
 * Returns the root runtime context
 * @see Context
 * @return {Context} The root runtime context.
 */
Runtime.prototype.getContext = function() {
  if (this._rootCtx) {
    return this._rootCtx;
  }
  var ctx = new context.Context();
  ctx = ctx.withValue(SharedContextKeys.COMPONENT_NAME, this._name);
  if (this._language) {
    ctx = ctx.withValue(SharedContextKeys.LANG_KEY, this._language);
  }
  ctx = vtrace.withNewStore(ctx);
  ctx = vtrace.withNewTrace(ctx);
  this._rootCtx = ctx;
  return ctx;
};

/**
 * Returns the pre-configured Namespace that is created
 * when the Runtime is initialized.
 * @return {Namespace} A namespace client instance.
 */
Runtime.prototype.namespace = function() {
  this._ns = this._ns || new Namespace(this.newClient(),
    this.getContext());
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
  var def = new Deferred(cb);
  var ctx = this.getContext();
  var controller = this._controller;
  controller.createBlessings(ctx, extension, function(err, id, key) {
    if (err !== null) {
      def.reject(err);
    } else {
      def.resolve(new Blessings(id, key, controller));
    }
  });
  return def.promise;
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
    vlog.info('Using WSPR at: %s', this._wspr);
    ProxyConnection = require('../proxy/websocket');
    this._proxyConnection = new ProxyConnection(this._wspr);
  } else {
    vlog.info('Using the Veyron Extension\'s NaCl WSPR');
    ProxyConnection = require('../proxy/nacl');
    this._proxyConnection = new ProxyConnection();
  }

  // relay crash event from proxy
  this._proxyConnection.on('crash', this.emit.bind(this, 'crash'));

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
      this._name, this.getContext(), this._controller);
  }
  return this._router;
};
