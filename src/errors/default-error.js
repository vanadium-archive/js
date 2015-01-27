var defaultCatalog = require('../runtime/default-catalog');
var defaultLanguage = require('../runtime/default-language');
var SharedContextKeys = require('../runtime/shared-context-keys');
var inherits = require('util').inherits;
module.exports = DefaultError;

function DefaultError(id, action, ctx, args, dontAddComponentAndOp) {
  if (!(this instanceof DefaultError)) {
    return new DefaultError(id, action, ctx, args);
  }
  args = args || [];
  this.paramList = args;
  this.idAction = {
    id: id,
    action: action,
  };
  var langId = ctx.value(SharedContextKeys.LANG_KEY) || defaultLanguage;
  if (!dontAddComponentAndOp) {
    // The first argument is the server name.  For now well just pass in
    // app, but this should be in the context somehow.  The second parameter
    // is the operation.  This we can't get until vtrace works.
    // TODO(bjornick): Revisit after vtrace.
    args.unshift('op');
    args.unshift(ctx.value(SharedContextKeys.COMPONENT_NAME) || 'app');
  }
  this.message = defaultCatalog.format(langId, id, args);

  if (typeof Error.captureStackTrace === 'function') {
    Error.captureStackTrace(this, DefaultError);
  } else {
    this.stack = (new Error()).stack;
  }
}
inherits(DefaultError, Error);
