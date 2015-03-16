/**
 * @fileoverview A lightweight logging framework for JavaScript to be used
 * in place of console so that we can persist the logs if needed and turn
 * logging off at different levels.
 * @private
 */

var extend = require('xtend');
/**
 * The log levels used to configure the vanadium logger
 * @namespace
 * @memberof module:vanadium.vlog
 */
var levels = {
  /**
   * No logs are written
   */
  NOLOG: 0,
  /**
   * Only errors are written
   */
  ERROR : 1,
  /**
   * Only errors and warnings are written
   */
  WARN: 2,
  /**
   * Errors, warnings and debug messages are written
   */
  DEBUG : 3,
  /**
   * All logs are written
   */
  INFO : 4
};
var defaults = {
  level: levels.NOLOG,
  console: console
};

/**
 * The Vanadium logger
 * @memberof module:vanadium.vlog
 * @constructor
 * @param {object} options The options to configure the logger with.  This
 * object has two fields, level which is one of the [log level constants]{@link
 * module:vanadium.vlog.level} and console which is the console to write to.
 */
var Vlog = function(options) {
  if (!(this instanceof Vlog)) { return new Vlog(options); }

  var vlog = this;

  options = extend(defaults, options);

  vlog.level = options.level;
  vlog.console = options.console;
};

/**
 * Logs arguments as errors to the console if log level is error or higher
 * @param {...*} values The values to log
 */
Vlog.prototype.error = function() {
  this._log(levels.ERROR, arguments);
};

/**
 * Logs arguments as warnings to the console if log level is warning or higher
 * @param {...*} values The values to log
 */
Vlog.prototype.warn = function() {
  this._log(levels.WARN, arguments);
};

/**
 * Logs arguments as logs to the console if log level is debug or higher
 * @param {...*} values The values to log
 */
Vlog.prototype.debug = function() {
  this._log(levels.DEBUG, arguments);
};

/**
 * Logs arguments as info to the console if log level is info or higher
 * @param {...*} values The values to log
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
   * Default logger
   * @memberof module:vanadium.vlog
   * @type {module:vanadium.vlog.Vlog}
   */
  logger: new Vlog(),
  Vlog: Vlog,
  levels: levels
};
