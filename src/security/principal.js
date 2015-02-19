/**
 * @fileoverview Principal stub for veyron principals
 * @private
 */

var Deferred = require('../lib/deferred');
var SimpleHandler = require('../proxy/simple-handler');
var Blessings = require('./blessings');
var MessageType = require('../proxy/message-type');
var EncodeUtil = require('../lib/encode-util');
var Context = require('../runtime/context').Context;
var BlessingRequest =
  require('../v.io/wspr/veyron/services/wsprd/app').BlessingRequest;

/**
 * Principal represents an entity capable of making or receiving RPCs.
 * @constructor
 */
function Principal(proxy) {
  this._proxy = proxy;
}

/**
 * Blesses the blessee's public key with the given caveats.
 * @param {Blessings} blessee: a blessing on the public key to bless.
 * @param {String} extension: the extension for the blessing.
 * @param {Number} duration: the duration of the blessing in milliseconds.
 * @param {Array} caveats: an array of Cavaeats to restrict the blessing.
 * @papram {function} cb an optional callback that will return the blessing
 * @return {Promise} a promise that will be resolved with the blessing
 */
Principal.prototype.bless = function(blessee, extension, duration, caveats,
                                     cb) {
  var def = new Deferred(cb);
  if (!(blessee instanceof Blessings)) {
    def.reject(new Error('blessee should be of type Blessings'));
    return def.promise;
  }

  var message;
  try {
    message = EncodeUtil.encode(new BlessingRequest({
      handle: blessee._id,
      extension: extension,
      durationMs: duration,
      caveats: caveats
    }));
  } catch(e) {
    def.reject(e);
    return def.promise;
  }

  var id = this._proxy.nextId();
  var handler = new SimpleHandler(new Context(), def, this._proxy, id);
  this._proxy.sendRequest(message, MessageType.BLESS_PUBLICKEY, handler, id);
  var self = this._proxy;
  return def.promise.then(function(message) {
    var id = new Blessings(message.handle, message.publicKey, self._proxy);
    return id;
  });
};

module.exports = Principal;
