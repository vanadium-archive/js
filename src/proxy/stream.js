/**
 * @fileoverview Streaming RPC implementation on top of websockets.
 */

var Deferred = require('./../lib/deferred');
var MessageType = require('./message_type');

/**
 * A stream that allows sending and recieving data for a streaming rpc.  If
 * onmessage is set and a function, it will be called whenever there is data on.
 * the stream. The stream implements the promise api.  When the rpc is complete,
 * the stream will be fulfilled.  If there is an error, then the stream will be
 * rejected.
 * @constructor
 *
 * @param {number} flowId flow id
 * @param {Promise} webSocketPromise Promise of a websocket connection when
 * it's established
 */
var Stream = function(flowId, webSocketPromise) {
  // Call the deferred constructor.
  Deferred.call(this);
  this.flowId = flowId;
  this.webSocketPromise = webSocketPromise;
  this.onmessage = null;
};

Stream.prototype = Object.create(Deferred.prototype);

/**
 * Send data down the stream
 * @param {*} data the data to send to the other side.
 */
Stream.prototype.send = function(data) {
  var flowId = this.flowId;
  this.webSocketPromise.then(function(websocket) {
    websocket.send(JSON.stringify({
      id: flowId,
      data: JSON.stringify(data),
      type: MessageType.STREAM_VALUE
    }));
  });
};

/**
 * Closes the stream, telling the other side that there is no more data.
 */
Stream.prototype.close = function() {
  var flowId = this.flowId;
  this.webSocketPromise.then(function(websocket) {
    websocket.send(JSON.stringify({
      id: flowId,
      type: MessageType.STREAM_CLOSE
    }));
  });
};

module.exports = Stream;
