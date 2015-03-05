var Incoming = require('./message-type').Incoming;
var DecodeUtil = require('../lib/decode-util');
var emitStreamError = require('../lib/emit-stream-error');
var vError = require('../gen-vdl/v.io/v23/verror');

module.exports = Handler;

/*
 * A simple incoming stream handler that handles incoming response, error
 * and close messages and queues them on the given stream object.
 * @param {Stream} Stream instance
 * @constructor
 */
function Handler(ctx, stream) {
  this._ctx = ctx;
  this._stream = stream;
}

Handler.prototype.handleResponse = function(type, data) {
  switch (type) {
    case Incoming.STREAM_RESPONSE:
      try {
        data = DecodeUtil.decode(data);
      } catch (e) {
        emitStreamError(this._stream,
          new vError.InternalError(this._ctx,
                                   ['Failed to decode result: ', e]));
        return true;
      }

      this._stream._queueRead(data);
      return true;
    case Incoming.STREAM_CLOSE:
      this._stream._queueRead(null);
      return true;
    case Incoming.ERROR_RESPONSE:
      emitStreamError(this._stream, data);
      this._stream._queueRead(null);
      return true;
  }

  // can't handle the given type
  return false;
};
