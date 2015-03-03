var vdl = require('../vdl');

module.exports = unwrapArg;

/**
 * Unwrap decoded value into the format expected for args.
 * Specifically, the outermost layer is unwrapped iff the target
 * type is not any.
 * @private
 * @param {*} arg The argument.
 * @param {Type} targetType The VDL type for the argument.
 * @return {*} either arg or an unwrapped arg.
 */
function unwrapArg(arg, targetType) {
    if (targetType.kind === vdl.Kind.ANY) {
      return arg;
    }
    return vdl.TypeUtil.unwrap(arg);
}