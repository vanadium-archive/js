/**
 * @fileoverview Enum for outgoing message types
 * @private
 */

var MessageType = {
  REQUEST: 0, // Request to invoke a method on a Veyron name.
  SERVE: 1, // Request to serve a server in JavaScript under a Veyron name.
  RESPONSE: 2, // Indicates a response from a registered service in JavaScript.
  STREAM_VALUE: 3, // Indicates a stream value.
  STREAM_CLOSE: 4, // Request to close a stream.
  SIGNATURE: 5, // Request to get signature of a remote server.
  STOP: 6, // Request to stop a server.
  BLESS_PUBLICKEY:  7, // Request to bless a public key.
  UNLINK_BLESSINGS: 8, // Unlinks blessings.
  NEW_BLESSINGS: 9, // Creates a new Blessing for javascript.  This is only
                    // used by tests.
  LOOKUP_RESPONSE: 11, // Response from a lookup call to Javacript.
  AUTHORIZATION_RESPONSE: 12, // Response from an authorization call to JS.
  NAMESPACE_REQUEST: 13, // Request to call a method on the namespace client.
  CANCEL: 17, // Cancel an ongoing JS initiated call.
  ADD_NAME: 18, // Request to add a name to the server.
  REMOVE_NAME: 19, // Request to remove a name from the server.
  REMOTE_BLESSINGS: 20 // Request to get the remote blessings of a server.
};

module.exports = MessageType;
