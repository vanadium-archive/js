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
 *  s.register('video', videoService);
 *  s.publish('mymedia');
 */

'use strict';

var Deferred = require('./../lib/deferred');
var IdlHelper = require('./../idl/idl');
var vError = require('./../lib/verror');
var ServiceWrapper = IdlHelper.ServiceWrapper;

var nextServerID = 1; // The ID for the next server.

/**
 * represents a veyron server which allows registration of services that can be
 * invoked remotely via RPCs.
 * @constructor
 * @param {Object} proxyConnection Veyron proxy client
 */
var server = function(proxyConnection) {
  this._proxyConnection = proxyConnection;
  this.id = nextServerID++;
  this.registeredServices = {};
  this._knownServiceDefinitions = {};
};

/**
 * addIDL adds an IDL file to the set of definitions known by the server.
 * Services defined in IDL files passed into this method can be used to
 * describe the interface exported by a serviceObject passed into register.
 * @param {string} idlContents the contents of an idl file.
 */
server.prototype.addIDL = function(idlContents) {
  var updates = IdlHelper.parseIDL(idlContents);
  for (var key in updates) {
    if (updates.hasOwnProperty(key)) {
      this._knownServiceDefinitions[key] = updates[key];
    }
  }
};

/**
 * publish enables the services registered thus far to service RPCs.  It will
 * register them with the mount table and maintain that registration so long
 * as the stop() method has not been called.  The name determines where
 * in the mount table's name tree the new services will appear.  The name is
 * applied as a prefix to the names specified in register.

 * To serve names of the form "mymedia/media/*" make the calls:
 * register("media", mediaSvc);
 * publish("mymedia");

 * publish may be called multiple times to publish the same server under
 * multiple names.
 *
 * @param {string} name Name to publish under
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when publish completes or fails
 * the endpoint address of the server will be returned as the value of promise
 */
server.prototype.publish = function(name, callback) {
  return this._proxyConnection.publishServer(name, this, callback);
};

/**
 * Stop gracefully stops all services on this Server.
 * New calls are rejected, but any in-flight calls are allowed to complete.
 * All published named are unmounted.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when stop service completes or fails
 */
server.prototype.stop = function(callback) {
  return this._proxyConnection.stopServer(this, callback);
};

/**
 * register associates a service object with a name within a server. Object's
 * methods become available to be invoked via RPC calls to that name after the
 * server is published.
 * Service object can be any JavaScript objects that expose methods to be called
 * remotely via RPCs.
 *
 *  register("media/video", videoSvc);
 *  register("media", mediaSvc);
 * and
 *  register("media", mediaSvc);
 *  register("media/video", videoSvc);
 * will both result in videoSvc being invoked for names of the form
 * "media/video/*". When there is a conflict between name prefixes,
 * the longest matching prefix is used.
 *
 * @param {string} name The name to register the service under
 * @param {Object} serviceObject service object to register
 * @param {*} serviceMetadata if provided a set of metadata for functions
 * in the service (such as number of return values).  It could either be
 * passed in as a properties object or a string that is the name of a
 * service that was defined in the idl files that the server knows about.
 * @param {function} callback if provided, the function will be called on
 * completion. The only argument is an error if there was one.
 * @return {Promise} Promise to be called when register completes or fails
 */
server.prototype.register = function(name, serviceObject, serviceMetadata,
                callback) {
  //TODO(aghassemi) Handle registering after publishing
  if (!callback && typeof(serviceMetadata) === 'function') {
    callback = serviceMetadata;
    serviceMetadata = null;
  }
  var def = new Deferred(callback);

  if (this.registeredServices[name] !== undefined) {
    var err = new Error('Service already registered under name: ' + name);
    def.reject(err);
  } else {
    var shouldCheckDefinition = false;
    if (typeof(serviceMetadata) === 'string') {
      var key = serviceMetadata;
      shouldCheckDefinition = true;
      serviceMetadata = this._knownServiceDefinitions[key];
      if (!serviceMetadata) {
        def.reject(new vError.NotFoundError('unknown service ' + key));
        return def.promise;
      }
    }

    var wrapper = new ServiceWrapper(serviceObject, serviceMetadata);

    if (shouldCheckDefinition) {
      var err2 = wrapper.validate(serviceMetadata);
      if (err2) {
        def.reject(err2);
        return def.promise;
      }
    }
    this.registeredServices[name] = wrapper;
    def.resolve();
  }

  return def.promise;
};

/**
 * Generates an IDL wire description for all the registered services
 * @return {Object.<string, Object>} map from service name to idl wire
 * description
 */
server.prototype.generateIdlWireDescription = function() {
  var servicesIdlWire = {};

  for (var serviceName in this.registeredServices) {
    if (this.registeredServices.hasOwnProperty(serviceName)) {
      var serviceMetadata = this.registeredServices[serviceName];
      servicesIdlWire[serviceName] =
          IdlHelper.generateIdlWireDescription(serviceMetadata);
    }
  }

  return servicesIdlWire;
};

/**
 * Get a service object for the specified service name.
 * @param {string} serviceName The service name.
 * @return {Object} The service definition, or undefined if not found.
 */
server.prototype.getServiceObject = function(serviceName) {
  return this.registeredServices[serviceName];
};

/**
 * Export the module
 */
module.exports = server;
