// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Streaming RPC implementation on top of websockets.
 * @private
 */

var Outgoing = require('./message-type').Outgoing;
var Duplex = require('stream').Duplex;
var vlog = require('../lib/vlog');
var inherits = require('inherits');
var reduce = require('../vdl/canonicalize').reduce;
var unwrap = require('../vdl/type-util').unwrap;
var ServerRpcReply =
  require('../gen-vdl/v.io/x/ref/services/wspr/internal/lib').ServerRpcReply;
var hexVom = require('../lib/hex-vom');

/**
 * @summary
 * A stream that allows sending and receiving data for a streaming rpc.
 * @description
 * <p>Stream is a
 * [Duplex Node.js stream]{@link https://nodejs.org/api/stream.html}
 * in 'objectMode'.
 * This constructor should not be directly called.</p>
 *
 * <p>If a 'data' event handler is specified, it will be called with data as
 * they become available.
 * <pre>
 *  stream.on('data', function(obj) {
 *    console.log(obj);
 *  });
 * </pre></p>
 * <p>
 * All other [Node.js stream]{@link https://nodejs.org/api/stream.html} events,
 * properties and function are also available on this stream as well.
 * </p>
 * @constructor
 * @inner
 * @memberof module:vanadium.rpc
 */
var Stream = function(flowId, webSocketPromise, isClient, readType, writeType,
                      typeEncoder) {
  Duplex.call(this, { objectMode: true });
  this.flowId = flowId;
  this.isClient = isClient;
  this.readType = readType;
  this.writeType = writeType;
  this.webSocketPromise = webSocketPromise;
  this.onmessage = null;
  this._typeEncoder = typeEncoder;

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

Stream.prototype.serverClose = function(results, err, traceResponse) {
  var object = {
    id: this.flowId,
    type: Outgoing.RESPONSE,
    data: hexVom.encode(new ServerRpcReply({
      results: results,
      err: err || null,
      traceResponse: traceResponse
    }), undefined, this._typeEncoder)
  };
  Duplex.prototype.write.call(this, object);
};

/**
 * Implements the _read method needed by those subclassing Duplex.
 * The parameter passed in is ignored, since it doesn't really make
 * sense in object mode.
 * @private
 */
Stream.prototype._read = function(size) {
  // On a call to read, copy any objects in the websocket buffer into
  // the internal stream buffer.  If we exhaust the websocket buffer
  // and still have more room in the internal buffer, we set shouldQueue
  // so we directly write to the internal buffer.
  var stream = this;
  var next = stream.wsBuffer.shift();

  // There could be a null value in stream.wsBuffer marking the end of the
  // stream, the explicit undefined check is to ensure empty values from the
  // stream.wsBuffer.shift() call above (marking an empty stream.wsBuffer array)
  // don't get pushed into the stream pipeline.
  if (typeof next !== 'undefined') {
    stream.push(next);
  }

  stream.shouldQueue = stream.wsBuffer.length === 0;
};

/**
 * Queue the object passed in for reading
 * TODO(alexfandrianto): Is this private? We call it in other places, and it
 * isn't overriding any of node's duplex stream functions.
 * @private
 */
Stream.prototype._queueRead = function(object) {
  if (!this.readType) {
    vlog.logger.warn('This stream cannot be read from. The service method ' +
      'lacks an', this.isClient ? 'outStream' : 'inStream', 'type. Tried to ' +
      'queue', object);
    return;
  }
  // Fill the read stream with the correct type.
  var canonObj = unwrap(reduce(object, this.readType));
  this._queueData(canonObj);
};

/**
 * Queue the close signal onto the Duplex's queue.
 * @private
 */
Stream.prototype._queueClose = function() {
  this._queueData(null);
};

/**
 * Queues the data onto the Duplex's queue.
 * @private
 */
Stream.prototype._queueData = function(data) {
  if (this.shouldQueue) {
    // If we have run into the limit of the internal buffer,
    // update this.shouldQueue.
    this.shouldQueue = this.push(data);
  } else {
    this.wsBuffer.push(data);
  }
};

/**
 * Writes an object to the stream.
 * @param {*} chunk The data to write to the stream.
 * @param {string} [encoding=null] ignored for object streams.
 * @param {module:vanadium~voidCb} cb If set, the function to call when the
 * write completes.
 * @return {boolean} Returns false if the write buffer is full.
 */
Stream.prototype.write = function(chunk, encoding, cb) {
  if (!this.writeType) {
    vlog.logger.warn('This stream cannot be written to. The service method ' +
      'lacks an',
      this.isClient ? 'inStream' : 'outStream', 'type. Tried to queue', chunk);
    return;
  }
  var object = {
    id: this.flowId,
    data: hexVom.encode(chunk, this.writeType, this._typeEncoder),
    type: Outgoing.STREAM_VALUE
  };
  return Duplex.prototype.write.call(this, object, encoding, cb);
};

Stream.prototype._write = function(chunk, encoding, cb) {
  this.webSocketPromise.then(function(websocket) {
    websocket.send(chunk);
    cb();
  });
};

/**
 * Writes an optional object to the stream and ends the stream.
 * @param {*} chunk The data to write to the stream.
 * @param {string} [encoding=null] Ignored for object streams.
 * @param {module:vanadium~voidCb} cb If set, the function to call when the
 * end call completes.
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
