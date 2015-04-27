// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview kind definitions.
 * @private
 */

/**
 * @summary Namespace of constants for VDL kinds.
 * @description Namespace of constants for VDL kinds.
 * @namespace
 * @memberof module:vanadium.vdl
 */
var kind = {
  // Nullable kinds
  /**
   * @const
   */
  ANY: 'any',
  /**
   * @const
   */
  OPTIONAL: 'optional',
  // Scalar kinds
  /**
   * @const
   */
  BOOL: 'bool',
  /**
   * @const
   */
  BYTE: 'byte',
  /**
   * @const
   */
  UINT16: 'uint16',
  /**
   * @const
   */
  UINT32: 'uint32',
  /**
   * @const
   */
  UINT64: 'uint64',
  /**
   * @const
   */
  INT16: 'int16',
  /**
   * @const
   */
  INT32: 'int32',
  /**
   * @const
   */
  INT64: 'int64',
  /**
   * @const
   */
  FLOAT32: 'float32',
  /**
   * @const
   */
  FLOAT64: 'float64',
  /**
   * @const
   */
  COMPLEX64: 'complex64',
  /**
   * @const
   */
  COMPLEX128: 'complex128',
  /**
   * @const
   */
  STRING: 'string',
  /**
   * @const
   */
  ENUM: 'enum',
  /**
   * @const
   */
  TYPEOBJECT: 'typeobject',
  // Composite kinds
  /**
   * @const
   */
  ARRAY: 'array',
  /**
   * @const
   */
  LIST: 'list',
  /**
   * @const
   */
  SET: 'set',
  /**
   * @const
   */
  MAP: 'map',
  /**
   * @const
   */
  STRUCT: 'struct',
  /**
   * Union is like struct, but with only 1 field filled in.
   * @const
   */
  UNION: 'union',
};

module.exports = kind;
