/**
 * @fileoverview Environment implementation for the browser.
 */

'use strict';

var features = require('./featuredetection');

var Environment = function() {

  /**
   * Whether WebSockets is supported by the environment or not
   * @type {Boolean}
   */
  this.supportsWebSockets = features.Supports.WebSockets();

  /**
   * A description of the environment for debug-only purpose
   * @type {String}
   */
  this.description = 'Browser environment with the UA: ' + getUserAgent();
};

/**
 * Gets the User Agent string of the browser
 * @private
 * @return {String} The User Agent string of the browser
 */
function getUserAgent() {
  return window.navigator.userAgent;
}

var environment = new Environment();

/**
 * Export the module
 */
module.exports = environment;
