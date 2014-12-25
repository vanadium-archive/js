/**
 * @fileoverview Channel RPCs to Nacl plugin.
 */

var vom = require('vom');
var channelVdl =
  require('../../vdl/v.io/wspr/veyron/services/wsprd/channel/channel');
var types = channelVdl.types;

module.exports = RpcChannel;

function uint8ArrayToArrayBuffer(arr) {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.length);
}

function RpcChannel(sendMessage) {
  if (!(this instanceof RpcChannel)) {
    return new RpcChannel(sendMessage);
  }
  this.sendMessage = sendMessage;
  this.lastSeq = 0;
  this.handlers = {};
  this.pendingCallbacks = {};
}

RpcChannel.prototype.registerRpcHandler = function(type, func) {
  this.handlers[type] = func;
};

RpcChannel.prototype.performRpc = function(type, val, callback) {
  if (typeof val !== 'object') {
    throw new Error('val must be of type object, was ' + (typeof val));
  }
  callback = callback || function(){};
  var seq = ++this.lastSeq;
  this.pendingCallbacks[seq] = callback;
  var request = new types.Request({
    type: type,
    seq: seq,
    body: val
  });
  this._sendVomEncodedMessage(new types.Message({
    request: request
  }));
};

RpcChannel.prototype._sendVomEncodedMessage = function(msg) {
  var writer = new vom.ByteArrayMessageWriter();
  var enc = new vom.Encoder(writer);
  enc.encode(msg);
  var encodedBytes = writer.getBytes();
  this._postMessage(uint8ArrayToArrayBuffer(encodedBytes));
};

RpcChannel.prototype._handleRequest = function(req) {
  var type = req.type;
  var handler = this.handlers[type];
  if (handler === undefined) {
    throw new Error('Undefined handler for type \'' + type + '\'');
  }
  var result;
  var err;
  try {
    result = handler(req.body);
  } catch (e) {
    err = e.message;
    // TODO(bprosnitz) Nil is not handled yet in VOM2.
    // Remove this when it is implemented.
    result = 'ResultMessageToBeRemovedWhenVOM2IsComplete';
  }
  var response = new types.Response({
    reqSeq: req.Seq,
    err: err || '',
    body: result
  });
  this._sendVomEncodedMessage(new types.Message({
    response: response
  }));
};

RpcChannel.prototype._handleResponse = function(resp) {
  var seq = resp.reqSeq;
  var cb = this.pendingCallbacks[seq];
  delete this.pendingCallbacks[seq];
  if (cb === undefined) {
    throw new Error('Received response with no matching sequence number '+
      JSON.stringify(resp));
  }
  if (resp.err !== '') {
    return cb(new Error(resp.err));
  }
  // TODO(nlacasse,bpronitz): Is it OK to just call "val" on the body like this?
  var body = resp.body && resp.body.val;
  cb(null, body);
};

RpcChannel.prototype.handleMessage = function(msg) {
  var msgBytes = new Uint8Array(msg);
  var reader = new vom.ByteArrayMessageReader(msgBytes);
  var dec = new vom.Decoder(reader);
  var jsMsg = dec.decode();
  if (jsMsg._type.name === types.Message.name) {
    throw new Error('Message does not have correct Message type: ' +
      JSON.stringify(jsMsg));
  } else if (jsMsg.request) {
    return this._handleRequest(jsMsg.request);
  } else if (jsMsg.response) {
    return this._handleResponse(jsMsg.response);
  } else {
    throw new Error('Message has Message type, but no "request" or ' +
        '"response" fields: ' + JSON.stringify(jsMsg));
  }
};

RpcChannel.prototype._postMessage = function(msg) {
  this.sendMessage({
    type: 'browsprRpc',
    instanceId: -1,
    origin: '',
    body: msg,
  });
};
