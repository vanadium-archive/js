/**
 * @fileoverview Vanadium Runtime
 * @private
 */
var EE = require('eventemitter2').EventEmitter2;
var isBrowser = require('is-browser');
var inherits = require('inherits');
var Server = require('../ipc/server');
var ServerRouter = require('../ipc/server-router');
var Client = require('../ipc/client');
var Namespace = require('../naming/namespace');
var CaveatValidatorRegistry = require('../security/caveat-validator-registry');
var Principal = require('../security/principal');
var Blessings = require('../security/blessings');
var Deferred = require('../lib/deferred');
var vlog = require('../lib/vlog');
var context = require('./context');
var SharedContextKeys = require('./shared-context-keys');
var vtrace = require('../vtrace');
var Controller =
  require('../gen-vdl/v.io/x/ref/services/wsprd/app').Controller;

module.exports = {
  init: init
};

/*
 * Initialize a Vanadium Runtime.
 * Runtime exposes entry points to create servers, client, blessing and other
 * parts of the Vanadium functionality.
 * @private
 */
function init(options, cb) {
  var def = new Deferred(cb);

  if (!isBrowser) {
    // In node we can just return the runtime.  No more initialization is
    // necessary.
    process.nextTick(function() {
      def.resolve(new Runtime(options));
    });
    return def.promise;
  }

  // In the browser, we must create the app instance in browspr.  We send along
  // the namespaceRoots and proxy, if they have been provided.  If they are
  // empty, the defaults from the extension options page will be used.
  var settings = {
    namespaceRoots: options.namespaceRoots || [],
    proxy: options.proxy || ''
  };

  var rt = new Runtime(options);
  rt._getProxyConnection().createInstance(settings, function(err) {
    if (err) {
      return def.reject(err);
    }
    def.resolve(rt);
  });

  return def.promise;
}

/**
 * Runtime exposes entry points to create servers, client, namespace client and
 * other parts of the Vanadium functionality.
 *
 * <p>This constructor should not be used directly, instead use
 * [vanadium.init]{@link module:vanadium.init}</p>
 *
 * <p>Runtime is also an EventEmitter:</p>
 * <p>
 *    Event: 'crash':
 *    Emitted when the runtime crashes in an unexpected way. Recovery from
 *    crash event requires restarting the application.
 * </p>
 * @constructor
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
 * Closes the runtime, freeing all the related resources and stopping and
 * unpublishing all the servers created in the runtime.
 *
 * @param {Function} [cb] Gets called once the runtime is closed.
 * @returns {Promise} Promise that will be resolved or rejected when runtime is
 * closed.
 */
Runtime.prototype.close = function(cb) {
  var router = this._getRouter();
  var proxy = this._getProxyConnection();
  return router.cleanup().then(function() {
      return proxy.close(cb);
  });
};

/**
 * Creates a new [server]{@link Server} instance.<br>
 * Server allows one to create, publish and stop Vanadium services.
 * @return {Server} A server instance.
 */
Runtime.prototype.newServer = function() {
  return new Server(this._getRouter());
};

/**
 * Creates a new [client]{@link Client} instance.<br>
 * Client allows one to bind to Vanadium names and call methods on them.
 * @return {Client} A Client instance.
 */
Runtime.prototype.newClient = function() {
  return new Client(this._getProxyConnection());
};

/**
 * Returns the root runtime [context]{@link module:vanadium.context.Context}<br>
 * Context objects provide a number of features such as
 * ability to provide configuration for requests such as timeout durations,
 * tracing across requests for debugging, etc...<br>
 * In order to provide these facilities context objects are required as the
 * first parameter for client calls and also for requests that are incoming
 * to servers.
 * @return {module:vanadium.context.Context} The root runtime context.
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
 * Returns a [namespace]{@link Namespace} client.
 * Namespace client enables interactions with the Vanadium namespace such as
 * globbing, mounting, setting permissions and other name related operations.
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
 * @private
 * @param {String} extension Extension for the Blessings .
 * @param {function} [cb] If provided a callback that will be called with the
 * new Blessings.
 * @return {Promise} A promise that resolves to the new Blessings
 */
Runtime.prototype._newBlessings = function(extension, cb) {
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
 * @private
 */
Runtime.prototype._getProxyConnection = function() {
  if (this._proxyConnection) {
    return this._proxyConnection;
  }

  var ProxyConnection;
  if (this._wspr) {
    vlog.logger.info('Using WSPR at: %s', this._wspr);
    ProxyConnection = require('../proxy/websocket');
    this._proxyConnection = new ProxyConnection(this._wspr);
  } else {
    vlog.logger.info('Using the Vanadium Extension\'s NaCl WSPR');
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
 * @private
 */
Runtime.prototype._getRouter = function() {
  if (!this._router) {
    this._router = new ServerRouter(
      this._getProxyConnection(),
      this._name,
      this.getContext(),
      this._controller,
      this.caveatRegistry);
  }
  return this._router;
};
