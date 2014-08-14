/**
 * @fileoverview A lightweight deferred implementation using ES6 Promise
 * Deferred are sometimes easier to use since they can be passed around
 * and rejected, resolved by other code whereas Promise API does not expose
 * reject and resolve publicly.
 */

var Promise = require('./promise');

var Deferred = function(cb) {
  var self = this;

  this.promise = new Promise(function(resolve, reject) {
    self.resolve = resolve;
    self.reject = reject;
  });
  if (cb) {
    this.promise.then(function resolve(v) {
      cb(null, v);
    }, function error(e) {
      cb(e);
    });
  }
};

/**
 * Export the module
 */
module.exports = Deferred;
