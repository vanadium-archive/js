var Deferred = require('../lib/deferred');
var MessageType = require('../proxy/message-type');
var Stream = require('../proxy/stream');
var SimpleHandler = require('../proxy/simple-handler');
var Context = require('../runtime/context').Context;

module.exports = Namespace;

/**
 * Creates a Namespace client stub to current runtime's Namespace.
 * @param {Proxy} Proxy instance.
 * @constructor
 */
function Namespace(proxy, rootCtx) {
  this._proxy = proxy;
  this._rootCtx = rootCtx;
}

var NamespaceMethods = {
  GLOB: 0,
  MOUNT: 1,
  UNMOUNT: 2,
  RESOLVE: 3,
  RESOLVETOMT: 4,
  FLUSHCACHEENTRY: 5,
  DISABLECACHE: 6,
  ROOTS: 7,
  SETROOTS: 8
};

/**
 * Glob streams all names matching pattern. If recursive is true, it also
 * returns all names below the matching ones.
 * @param {Context} ctx The rpc context.
 * @param {string} pattern Glob pattern to match
 * @param {function} cb(err, stream) Optional callback
 * @return {Promise} A promise with an stream object hanging from it.
 */
Namespace.prototype.glob = function(ctx, pattern, cb) {
  var args = {
    pattern: pattern
  };

  return this._sendRequest(ctx, NamespaceMethods.GLOB, args, cb, true);
};

/**
 * Mount the server object address under the object name, expiring after
 * @param {Context} ctx The rpc context.
 * @param {string} name Object name
 * @param {string} server Server object address
 * @param {integer} ttl Expiry time for the mount in milliseconds. ttl of zero
 * implies never expire.
 * @param {boolean} Optional replaceMount Whether the previous mount should
 * be replaced by the new server object address. False by default.
 * @param {function} cb(err) Optional callback
 * @return {Promise} A promise to be resolved when mount is complete or rejected
 * when there is an error
 */
Namespace.prototype.mount = function(ctx, name, server, ttl, replaceMount,
                                     cb) {
  ttl = ttl || 0; // Default is 0
  replaceMount = !!replaceMount; // Cast to bool
  var args = {
    name: name,
    server: server,
    ttl: ttl * 1000, // Go API uses nanoseconds, we use milliseconds in JS
    replaceMount: replaceMount
  };

  return this._sendRequest(ctx, NamespaceMethods.MOUNT, args, cb);
};

/**
 * Unmount the server object address from the object name, or if server is empty
 * unmount all server object address from the object name.
 * @param {Context} ctx The rpc context.
 * @param {string} name Object name
 * @param {string} server Server object address
 * @param {function} cb(err) Optional callback
 * @return {Promise} A promise to be resolved when unmount is complete or
 * rejected when there is an error
 */
Namespace.prototype.unmount = function(ctx, name, server, cb) {
  server = server || '';
  var args = {
    name: name,
    server: server
  };

  return this._sendRequest(ctx, NamespaceMethods.UNMOUNT, args, cb);
};

/**
 * Resolve the object name into its mounted servers.
 * @param {Context} ctx The rpc context
 * @param {string} name Object name
 * @param {function} cb(err, servers[]) Optional callback
 * @return {Promise} A promise to be resolved a string array of server object
 * addresses or rejected when there is an error
 */
Namespace.prototype.resolve = function(ctx, name, cb) {
  var args = {
    name: name
  };

  return this._sendRequest(ctx, NamespaceMethods.RESOLVE, args, cb);
};

/**
 * ResolveToMountTable resolves the object name into the mounttables
 * directly responsible for the name.
 * @param {Context} ctx The rpc context.
 * @param {string} name Object name
 * @param {function} cb(err, mounttables[]) Optional callback
 * @return {Promise} A promise to be resolved a string array of mounttable
 * object addresses or rejected when there is an error
 */
Namespace.prototype.resolveToMounttable = function(ctx, name, cb) {
  var args = {
    name: name
  };

  return this._sendRequest(ctx, NamespaceMethods.RESOLVETOMT, args, cb);
};

/*
 * FlushCacheEntry flushes resolution information cached for the name.
 * @param {string} name Object name
 * @param {function} cb(err, anythingFlushed) Optional callback
 * @return {Promise} A promise to be resolved a boolean indicating if anything
 * was flushed or rejected when there is an error
 */
Namespace.prototype.flushCacheEntry = function(name, cb) {
  var args = {
    name: name
  };

  return this._sendRequest(this._rootCtx,
                           NamespaceMethods.FLUSHCACHEENTRY, args, cb);
};

/*
 * Disables the resolution cache when set to true and enables if false.
 * @param {boolean} disable Whether to disable or enable cache.
 * @param {function} cb(err) Optional callback
 * @return {Promise} A promise to be resolved when disableCache is complete or
 * rejected when there is an error
 */
Namespace.prototype.disableCache = function(disable, cb) {
  disable = !!disable; // Cast to bool
  var args = {
    disable: disable
  };

  return this._sendRequest(this._rootCtx,
                           NamespaceMethods.DISABLECACHE, args, cb);
};

/**
 * Returns the currently configured roots. An empty array is returned if no
 * roots are configured.
 * @param {function} cb(err, roots[]) Optional callback
 * @return {Promise} A promise to be resolved with an array of root object names
 * when getRoots is complete or rejected when there is an error
 */
Namespace.prototype.roots = function(cb) {
  return this._sendRequest(this._rootCtx, NamespaceMethods.ROOTS, null,
                           cb);
};

/**
 * Sets the roots that the local Namespace is relative to.
 * All relative names passed to the methods above will be interpreted as
 * relative to these roots.
 * The roots will be tried in the order that they are specified in the parameter
 * list for setRoots.
 * @param {Array | varargs} roots object names for the roots
 * @param {function} cb(err) Optional callback
 * @return {Promise} A promise to be resolved when setRoots is complete or
 * rejected when there is an error
 */
Namespace.prototype.setRoots = function(roots, cb) {
  if (!Array.isArray(roots)) {
    roots = Array.prototype.slice.call(arguments);
    if (typeof roots[roots.length - 1] === 'function') {
      cb = roots.pop();
    } else {
      cb = null;
    }
  }
  var args = {
    roots: roots
  };

  return this._sendRequest(this._rootCtx,
                           NamespaceMethods.SETROOTS, args, cb);
};

//TODO(aghassemi) Implement Unresolve after Go library makes its changes.

Namespace.prototype._sendRequest = function(ctx, method, args, cb,
                                            isStreaming) {
  var def = new Deferred(cb);

  if (!(ctx instanceof Context)) {
    var err = new Error('First argument must be a Context object.');
    def.reject(err);
    return def.promise;
  }

  // Add an empty callback to the context.  This prevents "Possibly unhandled
  // errors" when the context is cancelled or times out.
  // TODO(mattr): Come up with a better solution than this hack.
  ctx.waitUntilDone(function(){});

  var id = this._proxy.nextId();
  if( isStreaming) {
    // TODO(alexfandrianto): I don't think this client stream sends anything.
    // What type do we want to give it? For now, I chose undefined.
    def.stream = new Stream(id, this._proxy.senderPromise, true, undefined);
    def.promise.stream = def.stream;
  }
  var handler = new SimpleHandler(ctx, def, this._proxy, id);
  var message = this._createMessage(method, args);
  this._proxy.sendRequest(message, MessageType.NAMESPACE_REQUEST, handler, id);
  return def.promise;
};

Namespace.prototype._createMessage = function(method, args) {
  var messageObject = {
    method: method,
    args: args || null
  };

  return JSON.stringify(messageObject);
};