/**
 * @fileoverview Defines helpers for dealing with types.
 */

 var Kind = require('./kind.js');

module.exports = {
  shouldSendLength: shouldSendLength
};

/**
 * Determines if the length should be sent in the header of a value message of
 * the specified type.
 * @param {Type} type The type.
 * @return {boolean} true if the length should be sent in the header of the
 * the value message or false otherwise.
 */
function shouldSendLength(type) {
  if (type.kind === Kind.ARRAY || type.kind === Kind.LIST) {
    return type.elem.Kind !== Kind.BYTE;
  }
  switch (type.kind) {
    case Kind.COMPLEX64:
    case Kind.COMPLEX128:
    case Kind.SET:
    case Kind.MAP:
    case Kind.STRUCT:
    case Kind.ANY:
    case Kind.ONEOF:
      return true;
    default:
      return false;
  }
}