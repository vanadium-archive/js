var Deferred = require('../lib/deferred');
var MessageType = require('../proxy/message_type');
var Stream = require('../proxy/stream');
var StreamHandler = require('../proxy/stream_handler');
var SimpleHandler = require('../proxy/simple_handler');

module.exports = Namespace;
/**
 * Create a new Namespace.
 * @param {Proxy} Proxy instance.
 * @param {string[]} Optional root names.
 * @constructor
 */
function Namespace(proxy, roots) {
    this._proxy = proxy;
    this._roots = roots;
}

var NamespaceMethods = {
    GLOB: 0,
    MOUNT: 1,
    UNMOUNT: 2,
    RESOLVE: 3
};

/**
 * Glob streams all names matching pattern. If recursive is true, it also
 * returns all names below the matching ones.
 * @param {string} pattern Glob pattern to match
 * @param {function} cb(err, stream) Optional callback
 * @return {Promise} A promise with an stream object hanging from it.
 */
Namespace.prototype.glob = function(pattern, cb) {
  var args = {
    pattern: pattern
  };

  return this._sendStreamingRequest(NamespaceMethods.GLOB, args, cb);
};

/*
 * Mount the server object address under the object name, expiring after
 * @param {string} name Object name
 * @param {string} server Server object address
 * @param {integer} ttl Expiry time for the mount in milliseconds. ttl of zero
 * implies never expire.
 * @param {boolean} Optional replaceMount Whether the previous mount should
 * be replaced by the new server object address. False by default.
 * @param {function} cb(err) Optional callback
 * @return {Promise} A promise to be resolved when mount is complete or rejected
 * when mount has an error
 */
Namespace.prototype.mount = function(name, server, ttl, replaceMount, cb) {
  ttl = ttl || 0; // Default is 0
  replaceMount = !!replaceMount; // Cast to bool
  var args = {
    name: name,
    server: server,
    ttl: ttl * 1000, // Go API uses nanoseconds, we use milliseconds in JS
    replaceMount: replaceMount
  };

  return this._sendRequest(NamespaceMethods.MOUNT, args, cb);
};

/*
 * Unmount the server object address from the object name, or if server is empty
 * unmount all server object address from the object name.
 * @param {string} name Object name
 * @param {string} server Server object address
 * @param {function} cb(err) Optional callback
 * @return {Promise} A promise to be resolved when unmount is complete or
 * rejected when mount has an error
 */
Namespace.prototype.unmount = function(name, server, cb) {
  server = server || '';
  var args = {
    name: name,
    server: server
  };

  return this._sendRequest(NamespaceMethods.UNMOUNT, args, cb);
};

/*
 * Resolve the object name into its mounted servers.
 * @param {string} name Object name
 * @param {function} cb(err, servers[]) Optional callback
 * @return {Promise} A promise to be resolved an string array of server object
 * addresses or rejected when mount has an error
 */
Namespace.prototype.resolve = function(name, cb) {
  var args = {
    name: name
  };

  return this._sendRequest(NamespaceMethods.RESOLVE, args, cb);
};

/**
 * Sets the roots that the local Namespace is relative to.
 * All relative names passed to the methods above will be interpreted as
 * relative to these roots.
 * The roots will be tried in the order that they are specified in the parameter
 * list for setRoots.
 * @param {Array | varargs} roots object names for the roots
 */
Namespace.prototype.setRoots = function(roots) {
  if (!Array.isArray(roots)) {
    roots = Array.prototype.slice.call(arguments);
  }
  this._roots = roots;
};

Namespace.prototype._sendRequest = function(method, args, cb) {
  var def = new Deferred(cb);
  var id = this._proxy.nextId();
  var handler = new SimpleHandler(def, this._proxy, id);
  var message = this._createMessage(method, args);
  this._proxy.sendRequest(message, MessageType.NAMESPACE_REQUEST, handler, id);
  return def.promise;
};

Namespace.prototype._sendStreamingRequest = function(method, args, cb) {
  var def = new Deferred(cb);
  var id = this._proxy.nextId();
  def.stream = new Stream(id, this._proxy.senderPromise, true);
  var handler = new StreamHandler(def.stream);
  var message = this._createMessage(method, args);
  this._proxy.sendRequest(message, MessageType.NAMESPACE_REQUEST, null, id);
  this._proxy.addIncomingStreamHandler(id, handler);

  def.promise.stream = def.stream;
  return def.promise;
};

Namespace.prototype._createMessage = function(method, args) {
  var messageObject = {
    method: method,
    args: args || null,
    roots: this._roots || []
  };

  return JSON.stringify(messageObject);
};