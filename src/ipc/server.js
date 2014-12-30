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
 *  @private
 */

var Deferred = require('./../lib/deferred');
var Promise = require('./../lib/promise');
var leafDispatcher = require('./leaf-dispatcher');
var vLog = require('./../lib/vlog');
var argHelper = require('./../lib/arg-helper');

var nextServerID = 1; // The ID for the next server.

// TODO(bjornick): Figure out how to get jsdoc to not generate comments for
// the constructor
/**
 * Represents a vanadium server which allows registration of services that can
 * be invoked remotely via RPCs. This constructor should not be used directly.
 * @class
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
 * annotations to the functions exported by the functions.  This is generally
 * created by running the vdl compiler.
 * @property {Authorize} authorizer An Authorizer that will handle the
 * authorization for the method call.  If null, then the default strict
 * authorizer will be used.
 */

/**
 * <p>Serve associates object with name by publishing the address
 * of this server with the mount table under the supplied name and using
 * authorizer to authorize access to it.</p>
 *
 * <p>To serve names of the form "mymedia/*" make the calls:</p>
 * <code>
 * serve("mymedia", serviceObject, { // optional authorizer
 *   authorizer: serviceAuthorizer
 * });
 * </code>
 * <p>If name is an empty string, no attempt will made to publish that
 * name to a mount table. It is an error to call {@link Server#serve|serve}
 * if either {@link Server#serveDispatcher|serveDispatcher} or
 * {@link Server.serve|serve} has already been called.
 * To serve the same object under multiple names,
 * {@link Server#addName|addName} can be used.</p>
 *
 * @public
 * @param {string} name Name to serve under
 * @param {object} serviceObject The service object that has a set of
 * exported methods
 * @param {ServeOptions} options Options config
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails.
 */
Server.prototype.serve = function(name, serviceObject, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = undefined;
  }

  var authorizer;

  if (options) {
    authorizer = options.authorizer;
  }
  var dispatcher = leafDispatcher(serviceObject, authorizer);
  return this.serveDispatcher(name, dispatcher, cb);
};

/**
 * @typedef DispatcherResponse
 * @type {Object}
 * @property {Invoker} service The Invoker that will handle
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
 * @param {Invoker} object The object that will handle the method call
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
 * <p>ServeDispatcher associates dispatcher with the portion of the mount
 * table's name space for which name is a prefix, by publishing the
 * address of this dispatcher with the mount table under the supplied name.
 * RPCs invoked on the supplied name will be delivered to the supplied
 * Dispatcher's lookup method which will in turn return the object. </p>
 *
 * <p>To serve names of the form "mymedia/*" make the calls: </p>
 * 
 * <code>
 * serve("mymedia", dispatcher);
 * </code>
 *
 * <p>If name is an empty string, no attempt will made to publish that
 * name to a mount table. </p>
 *
 * <p>It is an error to call {@link Server#serveDispatcher|serveDispatcher}
 * if {@link Server#serve|serve} has already been called. It is also an error
 * to call serveDispatcher multiple times.</p>
 * To serve the same dispatcher under multiple names,
 * {@link Server#addName|addName} can be used. </p>
 *
 * @public
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
 * @public
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
 * {@link Server#serve|serve}/{@link Server#serveDispatcher|
 * serveDispatcher} or {@link Server#addName|addName}.
 * @public
 * @param {string} name Name to remove
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when operation completes or fails
 */
Server.prototype.removeName = function(name, cb) {
  return this._router.removeName(name, this, cb);
};

/**
 * @private
 * @param {Number} handle The handle for the service
 * @return {Object} The invoker corresponding to the provided error.
 */
Server.prototype.getInvokerForHandle = function(handle) {
  var result = this.serviceObjectHandles[handle];
  delete this.serviceObjectHandles[handle];

  return result.invoker;
};

/**
 * Handles the authorization for an RPC.
 * @private
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

/**
 * Handles the result of lookup and returns an error if there was any.
 * @private
 */
Server.prototype._handleLookupResult = function(object) {
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

  var argsNames = argHelper.getArgumentNamesFromFunction(this.dispatcher);
  var useCallback = argsNames.length >= 2;
  var cb = function(err, val) {
    if (err === undefined || err === null) {
      def.resolve(val);
    } else {
      def.reject(err);
    }
  };

  var result;
  try {
    result = this.dispatcher(suffix, cb);
  } catch (e) {
    def.reject(e);
    vLog.error(e);
    return def.promise;
  }

  if (!useCallback) {
    if (result === undefined) {
      return def.promise.then(handleResult);
    }

    if (result instanceof Error) {
      def.reject(result);
      return def.promise;
    }

    def.resolve(result);
  }

  function handleResult(v) {
    var err = self._handleLookupResult(v);
    if (err) {
     return Promise.reject(err);
    }
    return Promise.resolve(v);
  }

  return def.promise.then(handleResult);
};

/**
 * Export the module
 */
module.exports = Server;
