/**
 * @fileoverview A lightweight deferred implementation using ES6 Promise
 * Deferred are sometimes easier to use since they can be passed around
 * and rejected, resolved by other code whereas Promise API does not expose
 * reject and resolve publicly.
 */

var Promise = require('./promise');

module.exports = Deferred;

function Deferred(cb) {
  var deferred = this;

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  if (cb) {
    deferred.promise
    .then(success, error);
  }

  function success(value) {
    cb(null, value);
  }

  function error(err) {
    cb(err);
  }
}
