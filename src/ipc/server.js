/**
 *  @fileoverview Server allows creation of services that can be invoked
 *  remotely via RPCs.
 *
 *  Usage:
 *  var videoService = {
 *    play: {
 *      // Play video
 *    }
 *  };
 *
 *  var s = new server(proxyConnection);
 *  s.serve('mymedia/video', videoService);
 */

var Deferred = require('./../lib/deferred');
var Promise = require('./../lib/promise');
var IdlHelper = require('./../idl/idl');
var leafDispatcher = require('./leaf_dispatcher');
var ServiceWrapper = IdlHelper.ServiceWrapper;
var vLog = require('./../lib/vlog');

var nextServerID = 1; // The ID for the next server.

/**
 * represents a veyron server which allows registration of services that can be
 * invoked remotely via RPCs.
 * @constructor
 * @param {Object} router the server router.
 */
function Server(router) {
  if (!(this instanceof Server)) {
    return new Server(router);
  }

  this._router = router;
  this._handle = 0;
  this.id = nextServerID++;
  this.dispatcher = null;
  this.serviceObjectHandles = {};
}

/*
 * TODO(aghassemi) Do we need 3 layers here? runtime, server and
 * server_router all have these serve(), stop(), addName(), removeName() methods
 * Maybe we can remove stuff from runtime and just expose getServer() or support
 * ability to have more than one server and expose createServer()
 */

/**
 * @typedef ServeOptions
 * @type {Object}
 * @property {object} metadata The metadata is an optional parameter that adds
 * annotations to the functions exported by the functions.  This is generally
 * created by running the vdl compiler.
 * @property {Authorize} authorizer An Authorizer that will handle the
 * authorization for the method call.  If null, then the default strict
 * authorizer will be used.
 */

/**
 * Serve associates object with name by publishing the address
 * of this server with the mount table under the supplied name and using
 * authorizer to authorize access to it.
 *
 * To serve names of the form "mymedia/*" make the calls:
 * serve("mymedia", serviceObject, { // optional metadata and authorizer
 *   metadata: serviceMetadata ,
 *   authorizer: serviceAuthorizer
 * });
 *
 * If name is an empty string, no attempt will made to publish that
 * name to a mount table. It is an error to call Serve if ServeDispatcher has
 * already been called.
 * It is also an error to call Serve multiple times.
 * To serve the same object under multiple names, addName() can be used.
 *
 * @param {string} name Name to serve under
 * @param {object} serviceObject The service object that has a set of
 * exported methods
 * @param {ServeOptions} options Object that includes metadata and authorizer
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails.
 */
Server.prototype.serve = function(name, serviceObject, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = undefined;
  }

  var serviceMetadata;
  var authorizer;

  if (options) {
    serviceMetadata = options.serviceMetadata;
    authorizer = options.authorizer;
  }
  var dispatcher = leafDispatcher(serviceObject, serviceMetadata, authorizer);
  return this.serveDispatcher(name, dispatcher, cb);
};

/**
 * @typedef DispatcherResponse
 * @type {Object}
 * @property {ServiceWrapper} service The ServiceWrapper that will handle
 * method call.
 * @property {Authorize} authorizer An Authorizer that will handle the
 * authorization for the method call.  If null, then the default strict
 * authorizer will be used.
 */

/**
 * A function that returns the service object for a suffix/method pair.
 * @callback Dispatcher
 * @param {string} suffix The suffix for the call
 * @param {string} method The method for the call
 * @param {Dispatcher-callback} cb The callback to call when the dispatch is
 * complete
 * @return {DispatcherResponse|Promise} Either the DispatcherResponse object to
 * handle the method call or a Promise that will be resolved the service
 * callback.
 */

/**
 * Callback passed into Dispatcher
 * @callback Dispatcher-callback
 * @param {Error} err An error if one occurred
 * @param {ServiceWrapper} object The object that will handle the method call
 */

/**
 * Callback passed into Authorize
 * @callback Authorize-callback
 * @param {Error} err If set, the reason that the authorization failed.
 */

/**
 * A function that returns an error if the operation is not authorized
 * @callback Authorize
 * @param {SecurityContext} context Rhe context of the rpc.
 * @param {Authorize-callback} cb The callback to call with the result if
 * the rpc is asynchronous.  This can be ignored if the Authorizer returns
 * a promise or the result.
 * @return {Promise|Error} Either an error that occurred (or null if there was
 * no error) or a Promise that will be resolved if the authorization succeeded
 * and rejected if it failed.
 */
/**
 * ServeDispatcher associates dispatcher with the portion of the mount
 * table's name space for which name is a prefix, by publishing the
 * address of this dispatcher with the mount table under the supplied name.
 * RPCs invoked on the supplied name will be delivered to the supplied
 * Dispatcher's lookup method which will in turn return the object
 *
 * To serve names of the form "mymedia/*" make the calls:
 * serve("mymedia", dispatcher);
 *
 * If name is an empty string, no attempt will made to publish that
 * name to a mount table.
 *
 * It is an error to call ServeDispatcher if Serve has already been
 * called.
 * It is also an error to call ServeDispatcher multiple times.
 * To serve the same dispatcher under multiple names, addName() can be used.
 *
 * @param {string} name Name to serve under
 * @param {Dispatcher} dispatcher A function that will take in the suffix
 * and the method to be called and return the service object for that suffix.
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails.
 */
Server.prototype.serveDispatcher = function(name, dispatcher, cb) {
  this.dispatcher = dispatcher;
  return this._router.serve(name, this, cb);
};

/**
 * Stop gracefully stops all services on this Server.
 * New calls are rejected, but any in-flight calls are allowed to complete.
 * All published named are unmounted.
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when stop service completes or fails
 */
Server.prototype.stop = function(cb) {
  return this._router.stopServer(this, cb);
};

/**
 * Adds the specified name to the mount table for the object or dispatcher
 * served by this server.
 * @param {string} name Name to publish
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when operation completes or fails
 */
Server.prototype.addName = function(name, cb) {
  return this._router.addName(name, this, cb);
};

/**
 * Removes the specified name from the mount table. It is an
 * error to specify a name that was not previously added using
 * serve/serveDispatcher or addName.
 * @param {string} name Name to remove
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when operation completes or fails
 */
Server.prototype.removeName = function(name, cb) {
  return this._router.removeName(name, this, cb);
};

/*
 * Returns the service that maps to the handle that is passed in
 * @param {Number} handle The handle for the service
 * @return {Object} The service object for the handle.
 */
Server.prototype.getServiceForHandle = function(handle) {
  var result = this.serviceObjectHandles[handle];
  delete this.serviceObjectHandles[handle];

  return result.service;
};

/*
 * Handles the authorization for an RPC.
 * @param {Number} handle The handle for the authorizer
 * @param {object} request The context of the authorization
 * @return {Promise} a promise that will be fulfilled with the result.
 */
Server.prototype.handleAuthorization = function(handle, request) {
  var handler = this.serviceObjectHandles[handle];
  if (!handler || !handler.authorizer) {
    return Promise.reject(new Error('Unknown handle ' + handle));
  }
  var def = new Deferred();

  function cb(e) {
    if (e) {
      def.reject(e);
      return;
    }
    def.resolve();
  }

  var result;
  try {
    result = handler.authorizer(request, cb);
  } catch (e) {
    vLog.error(e);
    return Promise.reject(e);
  }

  if (result === undefined) {
    return def.promise;
  }

  if (result === null) {
    return Promise.resolve();
  }

  if (result.then) {
    return result;
  }

  return Promise.reject(result);
};

/*
 * Handles the result of lookup and returns an error if there was any.
 */
Server.prototype._handleLookupResult = function(object) {
  if (!(object.service instanceof ServiceWrapper)) {
    return new Error('The result of lookup should be of type ServiceWrapper');
  }

  object._handle = this._handle;
  this.serviceObjectHandles[object._handle] = object;
  this._handle++;
  return null;
};

/*
 * Perform the lookup call to the user code on the suffix and method passed in.
 */
Server.prototype._handleLookup = function(suffix) {
  var self = this;
  var def = new Deferred();
  function cb(e, v) {
    if (e) {
      def.reject(e);
      return;
    }
    var err = self._handleLookupResult(v);
    if (err) {
      def.reject(err);
    } else {
      def.resolve(v);
    }
  }

  var result;
  try {
    result = this.dispatcher(suffix, cb);
  } catch (e) {
    def.reject(e);
    vLog.error(e);
    return def.promise;
  }

  function handleResult(v) {
    var err = self._handleLookupResult(v);
    if (err) {
     return Promise.reject(err);
    }
    return Promise.resolve(v);
  }

  if (result === undefined) {
    return def.promise.then(handleResult);
  }

  if (result instanceof Error) {
    def.reject(result);
    return def.promise;
  }

  var promise = Promise.resolve(result);
  return promise.then(handleResult);
};

/**
 * Export the module
 */
module.exports = Server;
