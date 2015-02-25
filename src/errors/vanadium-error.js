var defaultCatalog = require('../runtime/default-catalog');
var defaultLanguage = require('../runtime/default-language');
var SharedContextKeys = require('../runtime/shared-context-keys');
var inherits = require('inherits');
var Types = require('../vdl/types');
module.exports = VanadiumError;

function VanadiumError() {
  var args = Array.prototype.slice.call(arguments);
  if (Array.isArray(args[0]) && args.length === 1) {
    args = arguments[0];
  }

  if (!(this instanceof VanadiumError)) {
    return new VanadiumError(args);
  }
  var id = args.shift();
  var retry = args.shift();
  var ctx = args.shift();
  this.paramList = args;
  this.id = id;
  this.retryCode = retry;
  if (ctx) {
    this._langId = ctx.value(SharedContextKeys.LANG_KEY) || defaultLanguage;
  } else {
    this._langId = defaultLanguage;
  }
  // The first argument is the server name.  For now well just pass in
  // app, but this should be in the context somehow.  The second parameter
  // is the operation.  This we can't get until vtrace works.
  // TODO(bjornick): Revisit after vtrace.
  args.unshift('op');
  if (ctx) {
    args.unshift(ctx.value(SharedContextKeys.COMPONENT_NAME) || 'app');
  } else {
    args.unshift('app');
  }
  Object.defineProperty(this,
                        'message',
                        {
                          value: defaultCatalog.format(this._langId, id, args),
                          writable: true,
                        });
  this.msg = this.message;

  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, VanadiumError);
  } else {
    this.stack = (new Error()).stack;
  }
}
inherits(VanadiumError, Error);

VanadiumError.prototype.resetArgs = function() {
  var args = Array.prototype.slice.call(arguments);
  this.paramList = args;
  this.message = defaultCatalog.format(this._langId, this.id, args);
  this.msg = this.message;
};

VanadiumError.prototype._type = Types.ERROR.elem;
