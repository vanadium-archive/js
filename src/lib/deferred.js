/**
 * @fileoverview A lightweight deferred implementation using ES6 Promise
 * Deferred are sometimes easier to use since they can be passed around
 * and rejected, resolved by other code whereas Promise API does not expose
 * reject and resolve publicly.
 */

'use strict';

var Promise = require('./promise');

var deferred = function() {
  var self = this;

  this.promise = new Promise(function(resolve, reject) {
    self.resolve = resolve;
    self.reject = reject;
  });
};

/**
 * Export the module
 */
module.exports = deferred;
