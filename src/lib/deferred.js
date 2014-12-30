/**
 * @fileoverview A lightweight deferred implementation built on promises.
 *
 * A deferred encapsulates a promise and its resolve/reject methods in a single
 * object.  This makes deferreds easier to pass to around and resolve or reject
 * from other pieces of code.
 * @private
 */

var Promise = require('./promise');

module.exports = Deferred;

function Deferred(cb) {
  var deferred = this;

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });
  addCallback(deferred.promise, cb);
}

function addCallback(promise, cb) {
  if (cb) {
    // Note, this must be a .done() and not a .then().  Errors thrown inside of
    // a .then() callback are wrapped in a try/catch, whereas errors thrown
    // inside of a .done() callback will be thrown as an error.
    promise.done(
      function success(value) { cb(null, value); },
      function error(err) { cb(err); }
    );
  }
}

// This adds a callback to the deferred (for people using the callback api).
Deferred.prototype.addCallback = function(cb) {
  addCallback(this.promise, cb);
};
