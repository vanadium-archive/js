/**
 * @fileoverview Utilities for manipulating types.
 */

var Kind = require('./kind.js');

// TODO(bprosnitz) Should we add other helpers? Or is it better just to directly
// create the types in js?

module.exports = {
  ANY: primitiveType(Kind.ANY),
  BOOL: primitiveType(Kind.BOOL),
  BYTE: primitiveType(Kind.BYTE),
  UINT16: primitiveType(Kind.UINT16),
  UINT32: primitiveType(Kind.UINT32),
  UINT64: primitiveType(Kind.UINT64),
  INT16: primitiveType(Kind.INT16),
  INT32: primitiveType(Kind.INT32),
  INT64: primitiveType(Kind.INT64),
  FLOAT32: primitiveType(Kind.FLOAT32),
  FLOAT64: primitiveType(Kind.FLOAT64),
  COMPLEX64: primitiveType(Kind.COMPLEX64),
  COMPLEX128: primitiveType(Kind.COMPLEX128),
  STRING: primitiveType(Kind.STRING),
  TYPEVAL: primitiveType(Kind.TYPEVAL)
};

function primitiveType(kind) {
  return {
    kind: kind
  };
}
