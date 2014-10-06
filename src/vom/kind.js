/**
 * @fileoverview Kind definitions.
 */

var kindCount = 0;

var kind = {
  // Variant kinds
  ANY: kindCount++,
  ONEOF: kindCount++,
  NILABLE: kindCount++,
  // Scalar kinds
  BOOL: kindCount++,
  BYTE: kindCount++,
  UINT16: kindCount++,
  UINT32: kindCount++,
  UINT64: kindCount++,
  INT16: kindCount++,
  INT32: kindCount++,
  INT64: kindCount++,
  FLOAT32: kindCount++,
  FLOAT64: kindCount++,
  COMPLEX64: kindCount++,
  COMPLEX128: kindCount++,
  STRING: kindCount++,
  ENUM: kindCount++,
  TYPEVAL: kindCount++,
  // Composite kinds
  ARRAY: kindCount++,
  LIST: kindCount++,
  SET: kindCount++,
  MAP: kindCount++,
  STRUCT: kindCount++
};

module.exports = kind;