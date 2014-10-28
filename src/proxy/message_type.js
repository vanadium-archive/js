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
  LOOKUP_RESPONSE: 11, // Response from a lookup call to Javacript.
  AUTHORIZATION_RESPONSE: 12, // Response from an authorization call to JS.
  NAMESPACE_REQUEST: 13, // Request to call a method on the namespace client.
  BLESS_PUBLICKEY:  14, // Request to bless a public key.
  UNLINK_BLESSINGS: 15, // Unlinks blessings.
  NEW_BLESSINGS: 16, // Creates a new Blessing for javascript.  This is only
                     // used by tests.
  CANCEL: 17 // Cancel an ongoing JS initiated call.
};

module.exports = MessageType;
