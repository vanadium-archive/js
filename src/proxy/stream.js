/**
 * @fileoverview Streaming RPC implementation on top of websockets.
 * @private
 */

var Outgoing = require('./message-type').Outgoing;
var Duplex = require('stream').Duplex;
var inherits = require('inherits');
var EncodeUtil = require('../lib/encode-util');
var fill = require('../vdl/canonicalize').fill;
var ServerRPCReply =
  require('../v.io/x/ref/services/wsprd/lib').ServerRPCReply;

/**
 * A stream that allows sending and receiving data for a streaming rpc.  If
 * onmessage is set and a function, it will be called whenever there is data on.
 * the stream. The stream implements the promise api.  When the rpc is complete,
 * the stream will be fulfilled.  If there is an error, then the stream will be
 * rejected.
 * @constructor
 *
 * @param {number} flowId flow id
 * @param {Promise} webSocketPromise Promise of a websocket connection when
 * it's established
 * @param {boolean} isClient if set, then this is the client stream.
 * @param {vom.TypeObject} streamType Adds type info to data sent by the stream.
 */
var Stream = function(flowId, webSocketPromise, isClient, streamType) {
  Duplex.call(this, { objectMode: true });
  this.flowId = flowId;
  this.isClient = isClient;
  this.streamType = streamType;
  this.webSocketPromise = webSocketPromise;
  this.onmessage = null;

  // The buffer of messages that will be passed to push
  // when the internal buffer has room.
  this.wsBuffer = [];

  // If set, objects are directly written to the internal buffer
  // rather than wsBuffer.
  this.shouldQueue = false;
};

inherits(Stream, Duplex);

/**
 * Closes the stream, telling the other side that there is no more data.
 */
Stream.prototype.clientClose = function() {
  var object = {
    id: this.flowId,
    type: Outgoing.STREAM_CLOSE
  };
  Duplex.prototype.write.call(this, object);
};

Stream.prototype.serverClose = function(results, err) {
  var object = {
    id: this.flowId,
    type: Outgoing.RESPONSE,
    data: EncodeUtil.encode(new ServerRPCReply({
      results: results,
      err: err || null
    }))
  };
  Duplex.prototype.write.call(this, object);
};

/**
 * Implements the _read method needed by those subclassing Duplex.
 * The parameter passed in is ignored, since it doesn't really make
 * sense in object mode.
 * @private
 */
Stream.prototype._read = function() {
  // On a call to read, copy any objects in the websocket buffer into
  // the internal stream buffer.  If we exhaust the websocket buffer
  // and still have more room in the internal buffer, we set shouldQueue
  // so we directly write to the internal buffer.
  var i = 0;
  while (i < this.wsBuffer.length && this.push(this.wsBuffer[i])) {
    ++i;
  }
  if (i > 0) {
    this.wsBuffer = this.wsBuffer.splice(i);
  }

  this.shouldQueue = this.wsBuffer.length === 0;
};

/**
 * Queue the object passed in for reading
 * @private
 */
Stream.prototype._queueRead = function(object) {
  if (this.shouldQueue) {
    // If we have run into the limit of the internal buffer,
    // update this.shouldQueue.
    this.shouldQueue = this.push(object);
  } else {
    this.wsBuffer.push(object);
  }
};

/**
 * Writes an object to the stream.
 * @param {*} chunk The data to write to the stream.
 * @param {null} encoding ignored for object streams.
 * @param {function} cb if set, the function to call when the write
 * completes.
 * @return {boolean} Returns false if the write buffer is full.
 */
Stream.prototype.write = function(chunk, encoding, cb) {
  var canonChunk = fill(chunk, this.streamType);
  var object = {
    id: this.flowId,
    data: EncodeUtil.encode(canonChunk),
    type: Outgoing.STREAM_VALUE
  };
  return Duplex.prototype.write.call(this, object, encoding, cb);
};

Stream.prototype._write = function(chunk, encoding, cb) {
  this.webSocketPromise.then(function(websocket) {
    websocket.send(JSON.stringify(chunk));
    cb();
  });
};

/**
 * Writes an optional object to the stream and ends the stream.
 * @param {*} chunk The data to write to the stream.
 * @param {null} encoding ignored for object streams.
 * @param {function} cb if set, the function to call when the write
 * completes.
 */
Stream.prototype.end = function(chunk, encoding, cb) {
  if (this.isClient) {
    if (chunk !== undefined) {
      this.write(chunk, encoding);
    }
    this.clientClose();
  } else {
    // We probably shouldn't allow direct calls to end, since we need
    // a return value here, but if they are piping streams, the developer
    // probably doesn't care about the return value.
    this.serverClose();
  }

  Duplex.prototype.end.call(this, null, null, cb);
};

module.exports = Stream;
