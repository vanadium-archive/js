var defaultCatalog = require('../runtime/default-catalog');
var defaultLanguage = require('../runtime/default-language');
var SharedContextKeys = require('../runtime/shared-context-keys');
var inherits = require('inherits');
var Types = require('../vdl/types');
var TypeUtil = require('../vdl/type-util');
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
  this.msg = defaultCatalog.format(this._langId, id, args);

  Object.defineProperty(this,
                        'message',
                        {
                          value: this.msg,
                          writable: true
                        });

  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, VanadiumError);
  } else {
    Object.defineProperty(this, 'stack', { value: (new Error()).stack });
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

VanadiumError.prototype.clone = function() {
  var res = Object.create(this.constructor.prototype);
  Object.defineProperty(res, 'constructor', { value: this.constructor });
  // Make a copy of the paramList.
  if (TypeUtil.isWrapped(this.paramList)) {
    res.paramList = Object.create(this.paramList.constructor.prototype);
    Object.defineProperty(res.paramList, 'constructor', {
      value: this.paramList.constructor
    });
    res.paramList.val = TypeUtil.unwrap(this.paramList).slice(0);
  } else {
    res.paramList = this.paramList.slice(0);
  }
  res.id = this.id;
  res.retryCode = this.retryCode;
  res._langId = this._langId;
  Object.defineProperty(res, 'message', { value: this.msg });
  res.msg = this.msg;
  Object.defineProperty(res, 'stack', { value: this.stack });
  return res;
};
