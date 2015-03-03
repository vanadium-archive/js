var vdl = require('../v.io/x/ref/services/wsprd/namespace');
var time = require('../v.io/v23/vdlroot/time');
var emitStreamError = require('../lib/emit-stream-error');
var Readable = require('stream').Readable;
var inherits = require('util').inherits;

module.exports = Namespace;

/**
 * Creates a Namespace client stub to current runtime's Namespace.
 * @param {Client} Client instance.
 * @constructor
 */
function Namespace(client, rootCtx) {
  this._namespace = client.bindWithSignature(
    '__namespace', [vdl.Namespace.prototype._serviceDescription]);
  this._rootCtx = rootCtx;
}

function GlobStream(orig) {
  Readable.call(this, {objectMode: true});
  this._orig = orig;

  var stream = this;
  orig.on('end', function() {
    if (!stream._flow(true)) {
      orig.on('writable', stream._flow.bind(stream, true));
    }
  });
  orig.on('readable', stream._flow.bind(stream, false));

  stream._flow(false);
}

inherits(GlobStream, Readable);

GlobStream.prototype._flow = function(drain) {
  // We split the GlobReply union type and send GlobErrors through the
  // stream's error channel and valid MountPoints through the data channel.
  var chunk;
  while((chunk = this._orig.read()) !== null) {
    if (chunk.entry) {
      if (!this.push(chunk.entry)) {
        return false;
      }
    } else if (chunk.error) {
      emitStreamError(this, chunk.error.error);
    }
  }
  if (drain) {
    this.push(null);
  }
  return true;
};

GlobStream.prototype._read = function() {
  // We don't need to do anything, we're always trying to read.
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
  var promise = this._namespace.glob(ctx, pattern, cb);

  // We get back a single stream of errors and entries,
  // we now split them into a separate stream of errors and
  // data via a transform stream.
  var newPromise = Promise.resolve(promise);
  newPromise.stream = new GlobStream(promise.stream);
  return newPromise;
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
  var duration = new time.Duration({
    seconds: Math.floor(ttl / 1000),
    nanos: (ttl % 1000) * 1000000
  });
  replaceMount = !!replaceMount; // Cast to bool
  return this._namespace.mount(ctx, name, server, duration, replaceMount, cb);
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
  return this._namespace.unmount(ctx, name, server, cb);
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
  return this._namespace.resolve(ctx, name, cb);
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
  return this._namespace.resolveToMT(ctx, name, cb);
};

/*
 * FlushCacheEntry flushes resolution information cached for the name.
 * @param {string} name Object name
 * @param {function} cb(err, anythingFlushed) Optional callback
 * @return {Promise} A promise to be resolved a boolean indicating if anything
 * was flushed or rejected when there is an error
 */
Namespace.prototype.flushCacheEntry = function(name, cb) {
  return this._namespace.flushCacheEntry(this._rootCtx, name, cb);
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
  return this._namespace.disableCache(this._rootCtx, disable, cb);
};

/**
 * Returns the currently configured roots. An empty array is returned if no
 * roots are configured.
 * @param {function} cb(err, roots[]) Optional callback
 * @return {Promise} A promise to be resolved with an array of root object names
 * when getRoots is complete or rejected when there is an error
 */
Namespace.prototype.roots = function(cb) {
  return this._namespace.roots(this._rootCtx, cb);
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
      cb = undefined;
    }
  }
  return this._namespace.setRoots(this._rootCtx, roots, cb);
};

/**
 * Sets the ACL on a namespace.
 * If etag is specified and is different from the current etag on the ACL, an
 * error will be returned.
 * Note that setACL will completely replace the ACL on the name.  If you want to
 * update only a part of the ACL, you must first call getACL, modify the
 * returned ACL, and then call setACL with the modified ACL.  You should use the
 * etag parameter in this case to ensure that the ACL has not been modified in
 * between read and write.
 * @param {Context} ctx The rpc context.
 * @param {string} name name to set the ACL of
 * @params {Map} acl tagged ACL map to set on the name
 * @params {string} etag Optional etag of the ACL
 * @params {function} cb(err) Optional callback
 * @returns {Promise} A promise to be resolved when setACL is complete or
 * rejected when there is an error.
 */
Namespace.prototype.setACL = function(ctx, name, acl, etag, cb) {
  // TODO(nlacasse): It's *very* easy to lock yourself out of a name.  If you
  // accidentally call setACL without an Admin key you will be locked out, and
  // all further getACL/setACL on that name will fail with just "ErrNoAccess".
  // Should we provide an updateACL helper method that wraps getACL/setACL?
  // It's not clear exactly how it would work (what to overwrite, what to
  // append), but we should consider it.
  if (typeof etag === 'function') {
    cb = etag;
    etag = '';
  }
  if (typeof etag === 'undefined') {
    etag = '';
  }

  return this._namespace.setACL(ctx, name, acl, etag, cb);
};

/**
 * Gets the ACL on a namespace.
 * @param {Context} ctx The rpc context.
 * @param {string} name name to get the ACL of
 * @params {function} cb(err, acl, etag) Optional callback
 * @returns {Promise} A promise to be resolved when getACL is complete or
 * rejected when there is an error.
 */
Namespace.prototype.getACL = function(ctx, name, cb) {
  return this._namespace.getACL(ctx, name, cb);
};

//TODO(aghassemi) Implement Unresolve after Go library makes its changes.
