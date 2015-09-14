// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Deferred = require('./../lib/deferred');
var Promise = require('./../lib/promise');
var asyncCall = require('../lib/async-call');
var InspectableFunction = require('../lib/inspectable-function');
var vlog = require('./../lib/vlog');
var inspector = require('./../lib/arg-inspector');
var Invoker = require('./../invocation/invoker');
var defaultAuthorizer = require('../security/default-authorizer');
var actions = require('./../verror/actions');
var makeError = require('../verror/make-errors');
var ServerOption = require('./server-option');

var nextServerID = 1; // The ID for the next server.

/**
 * @summary
 * Server defines the interface for managing a collection of services.
 * @description
 * <p>Private Constructor, use
 * [Runtime#newServer]{@link module:vanadium~Runtime#newServer} or
 * [Runtime#newServerDispatchingServer]
 * {@link module:vanadium~Runtime#newServerDispatchingServer}
 * </p>
 * @inner
 * @constructor
 * @memberof module:vanadium.rpc
 */
function Server(router) {
  if (!(this instanceof Server)) {
    return new Server(router);
  }

  this._router = router;
  this._rootCtx = router._rootCtx;
  this._handle = 0;
  this.id = nextServerID++;
  this.dispatcher = null;
  this.serviceObjectHandles = {};
}

/**
 * Stop gracefully stops all services on this Server.
 * New calls are rejected, but any in-flight calls are allowed to complete.
 * All published named are unmounted.
 * @param {module:vanadium~voidCb} [cb] If provided, the function
 * will be called on completion.
 * @return {Promise<void>} Promise to be called when stop service completes or
 * fails
 */
Server.prototype.stop = function(cb) {
  return this._router.stopServer(this, cb);
};

/**
 * Adds the specified name to the mount table for the object or dispatcher
 * used to create this server.
 * @public
 * @param {string} name Name to publish.
 * @param {module:vanadium~voidCb} [cb] If provided, the function
 * will be called on completion.
 * @return {Promise<void>} Promise to be called when operation completes or
 * fails
 */
Server.prototype.addName = function(name, cb) {
  return this._router.addName(name, this, cb);
};

/**
 * Removes the specified name from the mount table.
 * @public
 * @param {string} name Name to remove.
 * @param {function} [cb] If provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise<void>} Promise to be called when operation completes or
 * fails.
 */
Server.prototype.removeName = function(name, cb) {
  return this._router.removeName(name, this, cb);
};

/*
 * Initializes the JavaScript server by creating a server object on
 * the WSPR side.
 * @private
 */
Server.prototype._init = function(name, dispatcher,
  serverOption, cb) {

  this.serverOption = serverOption || new ServerOption();
  this.dispatcher = dispatcher;
  return this._router.newServer(name, this, cb);
};

/**
 * @private
 * @param {Number} handle The handle for the service.
 * @return {Object} The invoker corresponding to the provided error.
 */
Server.prototype._getInvokerForHandle = function(handle) {
  var result = this.serviceObjectHandles[handle];
  delete this.serviceObjectHandles[handle];

  return result.invoker;
};

/**
 * Handles the authorization for an RPC.
 * @private
 * @param {Number} handle The handle for the authorizer.
 * @param {module:vanadium.context.Context} ctx The ctx of the
 * call.
 * @param {module:vanadium.security~SecurityCall} call The security call.
 * @return {Promise} A promise that will be fulfilled with the result.
 */
Server.prototype._handleAuthorization = function(handle, ctx, call) {
  var handler = this.serviceObjectHandles[handle];
  var authorizer = defaultAuthorizer;
  if (handler && handler.authorizer) {
    authorizer = handler.authorizer;
  }

  var def = new Deferred();
  var inspectableAuthorizer = new InspectableFunction(authorizer);
  asyncCall(ctx, null, inspectableAuthorizer, [], [ctx, call],
    function(err) {
      if (err) {
        def.reject(err);
        return;
      }
      def.resolve();
    });
  return def.promise;
};

var InvokeOnNonInvoker = makeError(
  'v.io/core/javascript.InvokeOnNonInvoker', actions.NO_RETRY,
  '{1:}{2:} trying to invoke on a non-invoker{:_}');
/**
 * Handles the result of lookup and returns an error if there was any.
 * @private
 */
Server.prototype._handleLookupResult = function(object) {
  if (!object.hasOwnProperty('service')) {
    // TODO(bjornick): Use the correct context here.
    throw new InvokeOnNonInvoker(this._rootCtx);
  }
  object._handle = this._handle;
  try {
    object.invoker = new Invoker(object.service);
  } catch (e) {
    vlog.logger.error('lookup failed', e);
    return e;
  }
  this.serviceObjectHandles[object._handle] = object;
  this._handle++;
  return null;
};

/*
 * Perform the lookup call to the user code on the suffix and method passed in.
 * @private
 */
Server.prototype._handleLookup = function(suffix) {
  var self = this;
  var def = new Deferred();

  var argsNames = inspector(this.dispatcher).names;
  var useCallback = argsNames.length >= 2;
  var cb = function(err, val) {
    if (err) {
      def.reject(err);
    } else {
      def.resolve(val);
    }
  };

  var result;
  try {
    result = this.dispatcher(suffix, cb);
  } catch (e) {
    def.reject(e);
    vlog.logger.error(e);
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