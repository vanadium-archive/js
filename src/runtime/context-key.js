module.exports = ContextKey;
var nextKey = 0;
/**
 * Creates an object that can be used as a key in the value and
 * withValue methods of a context.  Modules that want to attach data
 * to the context should first construct a key, then use that key
 * whenever they want to store or retrieve their data from the context.
 * @constructor
 * @memberof module:vanadium.context
 */
function ContextKey() {
  if (!(this instanceof ContextKey)) {
    return new ContextKey();
  }
  this._key = nextKey;
  nextKey++;
}
