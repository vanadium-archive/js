/**
 * @fileoverview Enum for outgoing message types
 */

var MessageType = {
  REQUEST: 0, // Request to invoke a method on a Veyron name
  SERVE: 1, // Request to serve a server in JavaScript under a Veyron name
  RESPONSE: 2, // Indicates a response from a registered service in JavaScript
  STREAM_VALUE: 3, // Indicates a stream value
  STREAM_CLOSE: 4, // Request to close a stream
  SIGNATURE: 5, // Request to get signature of a remote server
  STOP: 6, // Request to stop a server
  BLESS: 8, // Blesses an identity
  UNLINK_ID: 9, // Unlinks an identity
  NEW_ID: 10,  // Creates a new public id for javascript.  This is only used
               // by tests.
  LOOKUP_RESPONSE: 11, // Response from a lookup call to Javacript.
  AUTHORIZATION_RESPONSE: 12 // Response from an authorization call to JS.
};

module.exports = MessageType;
