// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @summary Namespace vlog defines and implements logging interfaces.
 * @description
 * <p>Namespace vlog defines and implements logging interfaces.</p>
 *
 * @namespace
 * @name vlog
 * @memberof module:vanadium
*/

var extend = require('xtend');
/**
 * @namespace
 * @summary Namespace levels defines the log levels used to configure the
 * vanadium logger.
 * @description Namespace levels defines the log levels used to configure the
 * vanadium logger.
 * @memberof module:vanadium.vlog
 */
var levels = {
  /**
   * No logs are written.
   * @const
   */
  NOLOG: 0,
  /**
   * Only errors are written.
   * @const
   */
  ERROR : 1,
  /**
   * Only errors and warnings are written.
   * @const
   */
  WARN: 2,
  /**
   * Errors, warnings, and debug messages are written.
   * @const
   */
  DEBUG : 3,
  /**
   * All logs are written.
   * @const
   */
  INFO : 4
};
var defaults = {
  level: levels.NOLOG, // Typically set through the default in vanadium.js
  console: console
};

/**
 * @summary Private Constructor. Use
 * [vanadium.vlog.logger]{@link module:vanadium.vlog.logger} as an instance.
 *
 * @memberof module:vanadium.vlog
 * @constructor
 * @inner
 */
var Vlog = function(options) {
  if (!(this instanceof Vlog)) { return new Vlog(options); }

  var vlog = this;

  options = extend(defaults, options);

  vlog.level = options.level;
  vlog.console = options.console;
};

/**
 * Logs arguments as errors to the console if log level is error or higher.
 * @param {...*} values The values to log.
 */
Vlog.prototype.error = function() {
  this._log(levels.ERROR, arguments);
};

/**
 * Logs arguments as warnings to the console if log level is warning or higher.
 * @param {...*} values The values to log.
 */
Vlog.prototype.warn = function() {
  this._log(levels.WARN, arguments);
};

/**
 * Logs arguments as logs to the console if log level is debug or higher.
 * @param {...*} values The values to log.
 */
Vlog.prototype.debug = function() {
  this._log(levels.DEBUG, arguments);
};

/**
 * Logs arguments as info to the console if log level is info or higher.
 * @param {...*} values The values to log.
 */
Vlog.prototype.info = function() {
  this._log(levels.INFO, arguments);
};

Vlog.prototype._log = function(level, args) {
  if (this.level >= level) {
    this._write(level, args);
  }
};

Vlog.prototype._write = function(level, args) {
  var vlog = this;
  var method;

  if (! vlog.console) {
    return;
  }

  switch (level) {
    case levels.ERROR:
      method = vlog.console.error;
      break;
    case levels.WARN:
      method = vlog.console.warn;
      break;
    case levels.DEBUG:
      method = vlog.console.log;
      break;
    case levels.INFO:
      method = vlog.console.info;
      break;
    default:
      method = vlog.console.log;
      break;
  }

  method.apply(vlog.console, args);
};

module.exports = {
  /**
   * Default logger instance.
   * @memberof module:vanadium.vlog
   * @type {module:vanadium.vlog~Vlog}
   */
  logger: new Vlog(),
  Vlog: Vlog,
  levels: levels
};
