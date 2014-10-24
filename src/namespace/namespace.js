var Deferred = require('../lib/deferred');
var MessageType = require('../proxy/message_type');
var Stream = require('../proxy/stream');
var StreamHandler = require('../proxy/stream_handler');

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
};

/**
 * Glob streams all names matching pattern. If recursive is true, it also
 * returns all names below the matching ones.
 * @param {string} pattern Glob pattern to match
 * @param {function} cb Optional callback that will be called with (err, stream)
 * @return {Promise} A promise with an stream object hanging from it.
 */
Namespace.prototype.glob = function(pattern, cb) {
  var def = new Deferred(cb);
  var id = this._proxy.nextId();

  def.stream = new Stream(id, this._proxy.senderPromise, true);

  var handler = new StreamHandler(def.stream);
  var args = {
    pattern: pattern
  };
  var message = createMessage(NamespaceMethods.GLOB, this._roots, args);

  this._proxy.sendRequest(message, MessageType.NAMESPACE_REQUEST, null, id);
  this._proxy.addIncomingStreamHandler(id, handler);

  def.promise.stream = def.stream;
  return def.promise;
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

function createMessage(method, roots, args) {
  var messageObject = {
    method: method,
    args: args || null,
    roots: roots || []
  };

  return JSON.stringify(messageObject);
}