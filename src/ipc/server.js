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

/**
 * represents a veyron server which allows registration of services that can be
 * invoked remotely via RPCs.
 * @constructor
 * @param {Object} proxyConnection Veyron proxy client
 */
var server = function(proxyConnection) {
  this._proxyConnection = proxyConnection;
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
 * @param {function} cb if provided, the function will be called on completion.
 * The only argument is an error if there was one.
 * @return {Promise} Promise to be called when publish completes or fails
 * the endpoint address of the server will be returned as the value of promise
 */
server.prototype.publish = function(name, cb) {
  return this._proxyConnection.publishServer(name, cb);
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
 * @param {function} cb if provided, the function will be called on completion.
 * The only argument is an error if there was one.
 * @return {Promise} Promise to be called when register completes or fails
 */
server.prototype.register = function(name, serviceObject, cb) {
  return this._proxyConnection.registerService(name, serviceObject, cb);
};

//TODO(aghassemi) Implement stop()

/**
 * Export the module
 */
module.exports = server;
