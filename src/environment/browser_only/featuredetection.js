/**
 * @fileoverview Browser feature detection
 */
'use strict';

var Features = {};

/**
 * Just chainable sugar for better readability
 */
Features.Supports = {};

/**
 * Checks for native web sockets support.
 * @return {Boolean} Whether browser supports web sockets or not.
 */
Features.Supports.WebSockets = function() {
  return typeof window.WebSocket !== 'undefined';
};

/**
 * Export the module
 */
module.exports = Features;
