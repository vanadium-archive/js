// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Vanadium.js promise implementation.
 *
 * This uses the native Promise implementation in browsers, and the es6-promise
 * polyfill in non-browsers.
 *
 * WARNING: es6 promises are notorius for eating errors. Make sure to add
 * 'catch()' to the end of promise chains so that errors can be caught and
 * handled.
 *
 * See for reference:
 *   http://blog.soareschen.com/the-problem-with-es6-promises
 *   https://github.com/soareschen/es6-promise-debugging
 *   https://github.com/petkaantonov/bluebird#error-handling
 *
 * @private
 */

var isBrowser = require('is-browser');

if (isBrowser) {
  // Use native Promise implementation in browsers.
  if (typeof Promise === 'undefined') {
    throw new Error('No native promise implementation found.');
  }
  module.exports = Promise;
} else {
  // Use es6-promise polyfill in non-browsers.
  // The require string is split so that browserify does not bundle es6-promise
  // library.
  module.exports = require('es6' + '-promise').Promise;
}
