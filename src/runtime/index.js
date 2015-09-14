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
var leafDispatcher = require('../rpc/leaf-dispatcher');
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
var BlessingsCache = require('../security/blessings-cache');
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
  this._client = new Client(this._getProxyConnection());
  this._controller = this._client.bindWithSignature(
    '__controller', [Controller.prototype._serviceDescription]);
  this.principal = new Principal(this.getContext(), this._controller);
  this._name = options.appName;
  this._language = options.language;
  this.caveatRegistry = new CaveatValidatorRegistry();
  this.blessingsCache = new BlessingsCache();
  this._blessingsRouter = new BlessingsRouter(this._getProxyConnection(),
    this.blessingsCache);
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

/* jshint ignore:start */
/**
 * NewServerOptionalArgs is a set of options that are passed to the
 * [serve]{@link module:vanadium~Runtime#newServer}.
 * @typedef module:vanadium.rpc~Server~NewServerOptionalArgs
 * @property {module:vanadium.security.Authorize} authorizer An Authorizer
 * that will handle the authorization for the method call.  If null, then the
 * default strict authorizer will be used.
 * @property {module:vanadium.rpc~Server~ServerOption} serverOption Optional
 * server configuration such as whether the server is a mount table or
 * represents a leaf server. serverOption can be created with the
 * [vanadium.rpc.serverOption(opts)]{@link module:vanadium.rpc#serverOption}
 * method.
 */

/**
 * Callback passed into NewServer and NewDispatchingServer
 * @callback module:vanadium.rpc~Server~NewServer-callback
 * @param {Error} err An error if one occurred.
 * @param {module:vanadium.rpc~Server} server The server object.
 */

// TODO(aghassemi) the serviceObject example needs to point to a "Guides" page
// on the website when we have it. https://github.com/vanadium/issues/issues/444
/**
 * <p>Asynchronously creates a server and associates object with name by
 * publishing the address of the server with the mount table under the supplied
 * name and using authorizer to authorize access to it.</p>
 * <p>If name is an empty string, no attempt will made to publish that
 * name to a mount table.
 * To publish the same object under multiple names,
 * {@link module:vanadium.rpc~Server#addName|addName} can be used.</p>
 * <p>Simple usage:</p>
 * <pre>
 * rt.newServer('service/name', serviceObject, {
 *   authorizer: serviceAuthorizer
 * }, function(server) {
 *   // server is now active and listening for RPC calls.
 * });
 * </pre>
 * <p>
 * serviceObject is simply a JavaScript object that implements service methods.
 * </p>
 * <p>
 * <pre>
 * var serviceObject = new MyService();
 * function MyService() {}
 * </pre>
 * <p>
 * Each service method must take [ctx]{@link module:vanadium.context.Context}
 * and [serverCall]{@link module:vanadium.rpc~ServerCall} as the
 * first two parameters.
 * </p>
 * <p>
 * The output arguments can be given in several forms - through direct return,
 * return of a promise or calling a callback that is optionally the
 * last parameter.
 * </p>
 * <pre>
 * // Sync method that echoes the input text immediately.
 * MyService.prototype.echo = function(ctx, serverCall, text) {
 *   return 'Echo: ' + text;
 * };
 * </pre>
 * <pre>
 * // Async method that echoes the input text after 1 second, using Promises.
 * MyService.prototype.delayedEcho = function(ctx, serverCall, text) {
 *   return new Promise(function(resolve, reject) {
 *     setTimeout(function() {
 *       resolve('Echo: ' + text);
 *     }, 1000);
 *   });
 * };
 *</pre>
 *<pre>
 * // Async method that echoes the input text after 1 second, using Callbacks.
 * MyService.prototype.delayedEcho = function(ctx, serverCall, text, callback) {
 *   setTimeout(function() {
 *     // first argument to the callback is error, second argument is results
 *     callback(null, 'Echo: ' + text);
 *   }, 1000);
 * };
 *</pre>
 *
 * @public
 * @param {string} name Name to publish under.
 * @param {object} serviceObject The service object that has a set of
 * exported methods.
 * @param {module:vanadium.rpc~Server~NewServerOptionalArgs} [optionalArgs]
 * Optional arguments for newServer such as 'authorizer' or 'serverOptions'.
 * @param {module:vanadium.rpc~Server~NewServer-callback} [cb] If provided,
 * the function will be called when server is ready and listening for RPC calls.
 * @return {Promise<module:vanadium.rpc~Server>} Promise to be called when
 * server is ready and listening for RPC calls.
 */
/* jshint ignore:end */
Runtime.prototype.newServer = function(name, serviceObject, optionalArgs, cb) {
  if (typeof optionalArgs === 'function') {
    cb = optionalArgs;
    optionalArgs = undefined;
  }
  optionalArgs = optionalArgs || {};
  var dispatcher = leafDispatcher(serviceObject, optionalArgs.authorizer);
  return this.newDispatchingServer(name, dispatcher,
    optionalArgs.serverOption, cb);
};

/**
 * @typedef module:vanadium.rpc~Server~ServerDispatcherResponse
 * @type {object}
 * @property {object} service The Invoker that will handle
 * method call.
 * @property {module:vanadium.security.Authorize} authorizer An Authorizer that
 * will handle the authorization for the method call.  If null, then the default
 * authorizer will be used.
 */

/**
 * A function that returns the service implementation for the object identified
 * by the given suffix.
 * @callback module:vanadium.rpc~Server~ServerDispatcher
 * @param {string} suffix The suffix for the call.
 * @param {module:vanadium.rpc~Server~ServerDispatcher-callback} cb
 * The callback to call when the dispatch is complete.
 * @return {Promise<module:vanadium.rpc~Server~ServerDispatcherResponse>}
 * Either the DispatcherResponse object to
 * handle the method call or a Promise that will be resolved the service
 * callback.
 */

/**
 * Callback passed into Dispatcher.
 * @callback module:vanadium.rpc~Server~ServerDispatcher-callback
 * @param {Error} err An error if one occurred.
 * @param {object} object The object that will handle the method call.
 */

/**
 * <p>Asynchronously creates a server and associates dispatcher with the
 * portion of the mount table's name space for which name is a prefix, by
 * publishing the address of this dispatcher with the mount table under the
 * supplied name.
 * RPCs invoked on the supplied name will be delivered to the supplied
 * Dispatcher's lookup method which will in turn return the object. </p>
 * <p>Simple usage:</p>
 * <pre>
 * rt.newDispatchingServer('service/name', dispatcher, function(server) {
 *   // server is now active and listening for RPC calls.
 * });
 * </pre>
 *
 * <p>If name is an empty string, no attempt will made to publish that
 * name to a mount table.
 * To publish the same object under multiple names,
 * {@link module:vanadium.rpc~Server#addName|addName} can be used.</p>
 *
 * @public
 * @param {string} name Name to publish under.
 * @param {module:vanadium.rpc~Server~ServerDispatcher} dispatcher A function
 * that will take in the suffix and the method to be called and return the
 * service object for that suffix.
 * @property {module:vanadium.rpc~Server~ServerOption} [serverOption] Optional
 * server configuration such as whether the server is a mount table or
 * represents a leaf server. serverOption can be created with the
 * [vanadium.rpc.serverOption(opts)]{@link module:vanadium.rpc#serverOption}
 * method.
 * @param {module:vanadium.rpc~Server~NewServer-callback} [cb] If provided,
 * the function will be called when server is ready and listening for RPC calls.
 * @return {Promise<module:vanadium.rpc~Server>} Promise to be called when
 * server is ready and listening for RPC calls.
 */
Runtime.prototype.newDispatchingServer = function(name, dispatcher,
  serverOption, cb) {

  if (typeof serverOption === 'function') {
    cb = serverOption;
    serverOption = undefined;
  }

  var def = new Deferred(cb);
  var server = new Server(this._getRouter());

  server._init(name, dispatcher, serverOption).then(function() {
    def.resolve(server);
  }).catch(def.reject);

  return def.promise;
};

/**
 * Returns a [Client]{@link module:vanadium.rpc~Client} instance.<br>
 * Client allows one to bind to Vanadium names and call methods on them.
 * @return {module:vanadium.rpc~Client} A Client instance.
 */
Runtime.prototype.getClient = function() {
  return this._client;
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
Runtime.prototype.getNamespace = function() {
  this._ns = this._ns || new Namespace(this.getClient(),
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
      this.blessingsCache);
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
      this.blessingsCache);
  }
  return this._granterRouter;
};