var IncomingPayloadType = require('./incoming_payload_type');
var ErrorConversion = require('./error_conversion');
var DecodeUtil = require('../lib/decode_util');
var vError = require('../lib/verror');

module.exports = Handler;

/*
 * A simple incoming stream handler that handles incoming response, error
 * and close messages and queues them on the given stream object.
 * @param {Stream} Stream instance
 * @constructor
 */
function Handler(stream) {
  this._stream = stream;
}

Handler.prototype.handleResponse = function(type, data) {
  switch (type) {
    case IncomingPayloadType.STREAM_RESPONSE:
      try {
      data = DecodeUtil.tryDecode(data);
    } catch (e) {
      this._stream.emit(
        new vError.InternalError('Failed to decode result: ' + e));
        return;
    }

      this._stream._queueRead(data);
      break;
    case IncomingPayloadType.STREAM_CLOSE:
      this._stream._queueRead(null);
      break;
    case IncomingPayloadType.ERROR_RESPONSE:
      this._stream.emit('error', ErrorConversion.toJSerror(data));
      break;
  }
};
