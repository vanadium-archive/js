var LRU = require('lru-cache');

module.exports = createMockProxy;

/*
 * Creates a mock proxy object.
 * @param {Function} requestHandler Function to provide results for a given
 * message, type request that comes to the proxy.
 */
function createMockProxy(requestHandler, signatureCacheTTL) {
  return {
    signatureCache: new LRU({
      maxAge: signatureCacheTTL || (3600 * 1000)
    }),
    cancelFromContext: function() {},
    nextId: function() {
      return 0;
    },
    sendRequest: function(data, type, handler, id) {
      var result = requestHandler(data, type);
      handler.handleResponse(0, result);
    },
    dequeue: function() {}
  };
}
