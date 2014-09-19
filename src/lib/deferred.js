/**
 * @fileoverview A lightweight deferred implementation using ES6 Promise
 * Deferred are sometimes easier to use since they can be passed around
 * and rejected, resolved by other code whereas Promise API does not expose
 * reject and resolve publicly.
 */

var Promise = require('es6-promise').Promise;

module.exports = Deferred;

function Deferred(cb) {
  var deferred = this;

  deferred.promise = new Promise(function(resolve, reject) {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  if (cb) {
    deferred.promise
    .then(success, error)
    .catch(crash);
  }

  function success(value) {
    cb(null, value);
  }

  function error(err) {
    cb(err);
  }

  function crash(err) {
    // NOTE: Debugging exceptions with the es6-promise library is
    // problematic due to the way wrapping the function calls in a
    // try/catch swallows exceptions (thrown errors, Type Errors, illegal
    // coercion, etc.) where an explicit call to promise.catch(fn) has been
    // omitted. Even if the .catch() method invocation is added there is no
    // way to bubble the error in a natural way. Errors within the catch
    // function are wrapped in the same promise try/catch machination so
    // throwing within the .catch() callback will not yield useful or
    // desired results.
    //
    // There are a few suggestions on how to deal with this:
    //
    // * Use a better library: http://goo.gl/M3qUpG
    // * Break the error out of the stack: http://goo.gl/yBL6Di
    // * "Double catch pattern": http://goo.gl/BgT8in
    //
    // Below is a primitive way to break the error out of the wrapping
    // promise stack as suggested by the author of the es6-promise library.
    // This should help with some of the common development problems where
    // errors are seemingly swallowed during testing and feature
    // development.
    //
    // This trick helps narrow down the source of common development bugs
    // related to evaporating exceptions, keep in mind it's not a total
    // fix as there are still some errors that are still not propagating
    // correctly.
    //
    // Please keep this note here until a better solution for debugging
    // exceptions with promises is made available.
    //
    // TODO(jasoncampbell): Find a better way to manage the problem of
    // debugging exceptions within promised wrapped code.
    process.nextTick(function(){
      throw err;
    });
  }
}
