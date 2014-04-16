/**
 * @fileoverview Enum for outgoing message types
 */

var MessageType = {
  REQUEST: 0, // Request to invoke a method on a Veyron name
  PUBLISH: 1, // Request to publish a server in JavaScript under a Veyron name
  REGISTER: 2, // Request to register a service in JavaScript under a prefix
  RESPONSE: 3, // Indicates a response from a registered service in JavaScript
  STREAM_VALUE: 4, // Indicates a stream value
  STREAM_CLOSE: 5, // Request to close a stream
  SIGNATURE: 6 // Request to get signature of a remote server
};

module.exports = MessageType;
