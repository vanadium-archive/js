/**
 * @fileoverview Environment implementation for NodeJS.
 */

'use strict';

var nodeVersion = require('./nodeversion');

var Environment = function() {

  /**
   * Whether WebSockets is supported by the environment or not
   * @type {Boolean}
   */
  this.supportsWebSockets = detectWebSocketSupport();

  /**
   * A description of the environment for debug-only purpose
   * @type {String}
   */
  this.description = 'NodeJS environment version: ' + nodeVersion;
};

/**
 * Gets whether WebSockts module is available.
 * @private
 * @return {Boolean} Whether WS modules is available in NodeJS
 */
function detectWebSocketSupport() {
  // True in normal cases since our library has WebSockets as a dependency
  try {
    require.resolve('ws');
    return true;
  } catch (e) {
    return false;
  }
}

var environment = new Environment();

/**
 * Export the module
 */
module.exports = environment;
