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

/**
 * A function that returns the service object for a suffix/method pair.
 * @callback Lookup
 * @param {string} suffix the suffix for the call
 * @param {string} method the method for the call
 * @param {Lookup-callback} cb the callback to call when the dispatch is
 * complete
 * @return {*} either the ServiceWrapper object to handle the method call or
 * a Promise that will be resolved the service callback
 */

/**
 * Callback passed into Lookup
 * @callback Lookup-callback
 * @param {Error} err an error if one occurred
 * @param {ServiceWrapper} object the object that will handle the method call
 */

/**
 * Serve serves the given service object under the given name.  It will
 * register them with the mount table and maintain that registration so long
 * as the stop() method has not been called.  The name determines where
 * in the mount table's name tree the new services will appear.
 *
 * To serve names of the form "mymedia/*" make the calls:
 * serve("mymedia", dispatcher);

 * serve may be called multiple times to serve the same service under
 * multiple names.  If different objects are given on the different calls
 * it is considered an error.
 *
 * @param {string} name Name to serve under
 * @param {Lookup} lookup a function that will take in the suffix
 * and the method to be called and return the service object for that suffix.
 * @param {function} cbif provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when serve completes or fails
 * the endpoint address of the server will be returned as the value of promise
 */
Server.prototype.serve = function(name, lookup, cb) {
  this.dispatcher = lookup;
  return this._router.serve(name, this, cb);
};

/**
 * Stop gracefully stops all services on this Server.
 * New calls are rejected, but any in-flight calls are allowed to complete.
 * All published named are unmounted.
 * @param {function} cb if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when stop service completes or fails
 */
Server.prototype.stop = function(cb) {
  return this._router.stopServer(this, cb);
};

/*
 * Returns the service that maps to the handle that is passed in
 * @param {Number} handle the handle for the service
 * @return {Object} the service object for the handle.
 */
Server.prototype.getServiceForHandle = function(handle) {
  var result = this.serviceObjectHandles[handle];
  if (result && !result._cacheObject) {
    delete this.serviceObjectHandles[handle];
  }

  return result;
};

/*
 * Handles the result of lookup and returns an error if there was any.
 */
Server.prototype._handleLookupResult = function(wrapper) {
  if (!(wrapper instanceof ServiceWrapper)) {
    return new Error('The result of lookup should be of type ServiceWrapper');
  }
  if (wrapper._handle !== undefined &&
      !this.serviceObjectHandles[wrapper._handle]) {
    return null;
  }
  wrapper._handle = this._handle;
  this.serviceObjectHandles[wrapper._handle] = wrapper;
  this._handle++;
  return null;
};

/*
 * Perform the lookup call to the user code on the suffix and method passed in.
 */
Server.prototype._handleLookup = function(suffix, method) {
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
    result = this.dispatcher(suffix, method, cb);
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
