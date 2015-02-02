/**
 * @fileoverview Kind definitions.
 */

var kindCount = 0;

var kind = {
  // Variant kinds TODO(alexfandrianto): ONEOF and NILABLE are not Variant kind?
  ANY: kindCount++,
  ONEOF: kindCount++, // TODO(alexfandrianto): Is UNION and is last Kind.
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
  TYPEOBJECT: kindCount++,
  // Composite kinds
  ARRAY: kindCount++,
  LIST: kindCount++,
  SET: kindCount++,
  MAP: kindCount++,
  STRUCT: kindCount++
};

kind.kindStr = function(k) {
  var kindKeys = Object.keys(kind).filter(function(key) {
    return kind[key] === k;
  });
  if (kindKeys.length !== 1) {
    throw new TypeError('kind: ' + k + ' is not a known kind');
  }
  return kindKeys[0].toLowerCase(); // There should only be 1 result.
};

module.exports = kind;