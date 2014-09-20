/**
 * @fileoverview A lightweight deferred implementation built on promises.
 *
 * A deferred encapsulates a promise and its resolve/reject methods in a single
 * object.  This makes deferreds easier to pass to around and resolve or reject
 * from other pieces of code.
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
    // Convert back to callback-based API.
    //
    // Note, this must be a .done() and not a .then().  Errors thrown inside of
    // a .then() callback are wrapped in a try/catch, whereas errors thrown
    // inside of a .done() callback will be thrown as an error.
    deferred.promise.done(
        function (value) { cb(null, value); },
        function (err) { cb(err); }
    );
  }
}
