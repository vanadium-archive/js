/**
 * @fileoverview Vanadium.js promise implementation.
 *
 * Currently this is just bluebird promises.
 *
 * We'd like our promise implementation to follow the es6/A+ promise spec, but
 * the "es6-promises" module eats errors, so we are using bluebird.
 *
 * See for reference:
 *   http://blog.soareschen.com/the-problem-with-es6-promises
 *   https://github.com/soareschen/es6-promise-debugging
 *   https://github.com/petkaantonov/bluebird#error-handling
 *
 * TODO(nlacasse): Wrap bluebird promises to only expose es6/A+ promise API.
 * Otherwise users might rely on non-A+ parts of the bluebird API, preventing us
 * from switching in the future.
 * @private
 */

var Promise = require('bluebird');
Promise.longStackTraces();

module.exports = Promise;
