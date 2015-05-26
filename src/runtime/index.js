// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Vanadium Runtime
 * @private
 */
var EE = require('eventemitter2').EventEmitter2;
var isBrowser = require('is-browser');
var Deferred = require('../lib/deferred');
var inherits = require('inherits');
var Server = require('../rpc/server');
var ServerRouter = require('../rpc/server-router');
var GranterRouter = require('../rpc/granter-router');
var Client = require('../rpc/client');
var Namespace = require('../naming/namespace');
var CaveatValidatorRegistry = require('../security/caveat-validator-registry');
var Principal = require('../security/principal');
var vlog = require('../lib/vlog');
var context = require('../context');
var SharedContextKeys = require('./shared-context-keys');
var vtrace = require('../vtrace');
var Controller =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/app').Controller;
var BlessingsManager = require('../security/blessings-manager');
var BlessingsRouter = require('../security/blessings-router');

module.exports = {
  init: init
};

/*
 * Initialize a Vanadium Runtime.
 * Runtime exposes entry points to create servers, client, blessing and other
 * Vanadium functionality.
 * @private
 */
function init(options, cb) {
  var rt = new Runtime(options);
  var promise = Promise.resolve(rt);

  if (isBrowser) {
    // In the browser, we must create the app instance in browspr.  We send
    // along the namespaceRoots and proxy, if they have been provided.  If they
    // are empty, the defaults from the extension options page will be used.
    var settings = {
      namespaceRoots: options.namespaceRoots || [],
      proxy: options.proxy || ''
    };

    promise = promise.then(function(rt) {
      var def = new Deferred();
      rt._getProxyConnection().createInstance(settings, function(err) {
        if (err) {
          return def.reject(err);
        }
        def.resolve(rt);
      });
      return def.promise;
    });
  }

  if (cb) {
    promise.then(function(rt) {
      cb(null, rt);
    }, function(err) {
      cb(err);
    });
  }
  return promise;
}

/**
 * Crash event.
 * <p>Emitted when the runtime crashes in an unexpected way. Recovery from
 * crash event requires restarting the application.<p>
 * @event module:vanadium~Runtime#crash
 */

/**
 * @summary
 * Runtime exposes entry points to create servers, client, namespace client and
 * other Vanadium functionality.
 * @Description
 * <p>This constructor should not be used directly, instead use
 * [vanadium.init]{@link module:vanadium.init}</p>
 *
 * <p>Runtime is also an EventEmitter and emits
 * [crash event]{@link module:vanadium~Runtime#event:crash} when it crashes in
 * an unexpected way.</p>
 *
 * @property {string} accountName The accountName that the user associated to
 * this runtime.
 * @property {module:vanadium.security~Principal} principal The principal
 * associated with this runtime.  All operations that come from this
 * runtime, including operations that come from
 * [Servers]{@link module:vanadium.rpc~Server} and
 * [Clients]{@link module:vanadium.rpc~Client}, will use this principal.
 * @property {module:vanadium.security~CaveatValidatorRegistry} caveatRegistry
 * Used to register custom first party caveat validators.
 * @inner
 * @memberof module:vanadium
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
  this.blessingsManager = new BlessingsManager(this._controller);
  this._blessingsRouter = new BlessingsRouter(this._getProxyConnection(),
    this.blessingsManager);
}

inherits(Runtime, EE);

/**
 * Closes the runtime, freeing all the related resources and stopping and
 * unpublishing all the servers created in the runtime.
 *
 * @param {function} [cb] Gets called once the runtime is closed.
 * @returns {Promise} Promise that will be resolved or rejected when runtime is
 * closed.
 */
Runtime.prototype.close = function(cb) {
  if (this._crashed) {
    // NaCl plugin crashed. Shutting down will not work.
    return process.nextTick(function() {
      cb(new Error('Runtime crashed, can not shutdown gracefully.'));
    });
  }

  var router = this._getRouter();
  var proxy = this._getProxyConnection();
  return router.cleanup().then(function() {
      return proxy.close(cb);
  });
};

/**
 * Creates a new [Server]{@link module:vanadium.rpc~Server} instance.<br>
 * Server allows one to create, publish and stop Vanadium services.
 * @param {module:vanadium.rpc~Server~ServerOption} [serverOption] Optional
 * server option that can be specified when creating a new server. serverOption
 * can be created with the
 * [vanadium.rpc.serverOption(opts)]{@link module:vanadium.rpc#serverOption}
 * method.
 * @return {module:vanadium.rpc~Server} A server instance.
 */
Runtime.prototype.newServer = function(serverOption) {
  return new Server(this._getRouter(), serverOption);
};

/**
 * Creates a new [Client]{@link module:vanadium.rpc~Client} instance.<br>
 * Client allows one to bind to Vanadium names and call methods on them.
 * @return {module:vanadium.rpc~Client} A Client instance.
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
  ctx = ctx.withValue(SharedContextKeys.RUNTIME, this);
  ctx = vtrace.withNewStore(ctx);
  ctx = vtrace.withNewTrace(ctx);
  this._rootCtx = ctx;
  return ctx;
};

/**
 * <p>Returns a [namespace]{@link module:vanadium.naming~Namespace} client.</p>
 * <p>Namespace client enables interactions with the Vanadium namespace such as
 * globbing, mounting, setting permissions and other name related operations.
 * </p>
 * @return {module:vanadium.naming~Namespace} A namespace client instance.
 */
Runtime.prototype.namespace = function() {
  this._ns = this._ns || new Namespace(this.newClient(),
    this.getContext());
  return this._ns;
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
  var self = this;
  this._proxyConnection.on('crash', function(e) {
    self._crashed = true;
    self.emit('crash', e);
  });

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
      this.caveatRegistry,
      this.blessingsManager);
  }
  return this._router;
};

/**
 * Get or creates a granter router
 * @return {GranterRouter} A granter router
 * @private
 */
Runtime.prototype._getGranterRouter = function() {
  if (!this._granterRouter) {
    this._granterRouter = new GranterRouter(
      this._getProxyConnection(),
      this.getContext(),
      this.blessingsManager);
  }
  return this._granterRouter;
};
