var ContextKey = require('./context-key');
/**
 * Key for name of the component
 * @private
 */
module.exports.COMPONENT_NAME = new ContextKey();

/**
 * Key for the language id
 * @private
 */
module.exports.LANG_KEY = new ContextKey();

/**
 * Key for the op
 * @private
 */
module.exports.OP = new ContextKey();
