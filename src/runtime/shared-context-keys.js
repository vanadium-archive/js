var ContextKey = require('./context-key');
/**
 * Key for name of the component
 */
module.exports.COMPONENT_NAME = new ContextKey();

/**
 * Key for the language id
 */
module.exports.LANG_KEY = new ContextKey();

/**
 * Key for the op
 */
module.exports.OP = new ContextKey();
