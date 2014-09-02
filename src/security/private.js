/**
 * @fileoverview PrivateId stub for veyron identities
 */

var Deferred = require('../lib/deferred');
var SimpleHandler = require('../proxy/simple_handler');
var PublicId = require('./public');
var MessageType = require('../proxy/message_type');

/**
 * The private portion of a veyron identity
 */
function PrivateId(proxy) {
  this._proxy = proxy;
}

/*
 * Blesses the given PublicId with the given caveats.
 * @param {PublicId} blessee the PublicId to bless.
 * @param {String} name the name the bless the id under.
 * @param {Number} duration the duration of the blessing in milliseconds.
 * @param {Array} caveats an array of ServiceCavaeats.
 * @papram {function} cb an optional callback that will return the blessing
 * @return {Promise} a promise that will be resolved with the blessing
 */

PrivateId.prototype.bless = function(blessee, name, duration, caveats, cb) {
  var def = new Deferred(cb);
  if (!(blessee instanceof PublicId)) {
    def.reject(new Error('blessee should be of type PublicId'));
    return def.promise;
  }

  var message = JSON.stringify({
    handle: blessee._id,
    name: name,
    durationMs: duration,
    caveats: caveats
  });
  var id = this._proxy.nextId();
  var handler = new SimpleHandler(def, this._proxy, id);
  this._proxy.sendRequest(message, MessageType.BLESS, handler, id);
  var self = this._proxy;
  return def.promise.then(function(message) {
    var id = new PublicId(message.names, message.handle, self._proxy);
    return id;
  });
};

module.exports = PrivateId;
