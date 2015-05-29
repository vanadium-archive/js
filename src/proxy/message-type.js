// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Enums for low level message types.
 * @private
 */

module.exports = {
  Outgoing: {
    REQUEST: 0, // Request to invoke a method on a Vanadium name.
    RESPONSE: 2, // Indicates a response from a JavaScript server.
    STREAM_VALUE: 3, // Indicates a stream value.
    STREAM_CLOSE: 4, // Request to close a stream.
    LOOKUP_RESPONSE: 11, // Response from a lookup call to Javacript.
    AUTHORIZATION_RESPONSE: 12, // Response from an authorization call to JS.
    CANCEL: 17, // Cancel an ongoing JS initiated call.
    CAVEAT_VALIDATION_RESPONSE: 21, // Response to a caveat validation request.
    GRANTER_RESPONSE: 22, // Response from a granter
    TYPE_MESSAGE: 23,  // A type message from javascript.
  },
  Incoming: {
    INVOKE_REQUEST: 3, // Request to invoke a method on a JS server.
    FINAL_RESPONSE: 0, // Final response to a call originating from JS.
    ERROR_RESPONSE: 2, // Error response to a call originating from JS.
    STREAM_RESPONSE: 1, // Stream response to a call originating from JS.
    STREAM_CLOSE: 4,  // Response saying that the stream is closed.
    LOOKUP_REQUEST: 5, // A request to perform a dispatcher lookup.
    AUTHORIZATION_REQUEST: 6,  // A request to authorize an rpc.
    CANCEL: 7, // A request to cancel a previously invoked JS method.
    CAVEAT_VALIDATION_REQUEST: 8, // A request to validate a set of caveats
    LOG_MESSAGE: 9,  // A request to log a message.
    GRANTER_REQUEST: 10, // A request to call a granter
    BLESSINGS_CACHE_MESSAGE: 11, // A request to update the blessings cache
    TYPE_MESSAGE: 12,  // A type message from go.
  }
};
