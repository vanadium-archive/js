// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview kind definitions.
 * @private
 */

var kindCount = 0;

/**
 * Namespace of constants for VDL kinds
 * @namespace
 * @memberof module:vanadium.vdl
 */
var kind = {
  // Nullable kinds
  /**
   * @const
   */
  ANY: kindCount++,
  /**
   * @const
   */
  OPTIONAL: kindCount++,
  // Scalar kinds
  /**
   * @const
   */
  BOOL: kindCount++,
  /**
   * @const
   */
  BYTE: kindCount++,
  /**
   * @const
   */
  UINT16: kindCount++,
  /**
   * @const
   */
  UINT32: kindCount++,
  /**
   * @const
   */
  UINT64: kindCount++,
  /**
   * @const
   */
  INT16: kindCount++,
  /**
   * @const
   */
  INT32: kindCount++,
  /**
   * @const
   */
  INT64: kindCount++,
  /**
   * @const
   */
  FLOAT32: kindCount++,
  /**
   * @const
   */
  FLOAT64: kindCount++,
  /**
   * @const
   */
  COMPLEX64: kindCount++,
  /**
   * @const
   */
  COMPLEX128: kindCount++,
  /**
   * @const
   */
  STRING: kindCount++,
  /**
   * @const
   */
  ENUM: kindCount++,
  /**
   * @const
   */
  TYPEOBJECT: kindCount++,
  // Composite kinds
  /**
   * @const
   */
  ARRAY: kindCount++,
  /**
   * @const
   */
  LIST: kindCount++,
  /**
   * @const
   */
  SET: kindCount++,
  /**
   * @const
   */
  MAP: kindCount++,
  /**
   * @const
   */
  STRUCT: kindCount++,
  /**
   * Union is like struct, but with only 1 field filled in.
   * @const
   */
  UNION: kindCount++,
};

/**
 * Returns the human readable name for a kind
 * @param {module:vanadium.vdl.kind} k The kind to print out
 * @return {string}
 */
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
