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
   * @type {string}
   * @const
   */
  ANY: 'any',
  /**
   * @type {string}
   * @const
   */
  OPTIONAL: 'optional',
  // Scalar kinds
  /**
   * @type {string}
   * @const
   */
  BOOL: 'bool',
  /**
   * @type {string}
   * @const
   */
  BYTE: 'byte',
  /**
   * @type {string}
   * @const
   */
  UINT16: 'uint16',
  /**
   * @type {string}
   * @const
   */
  UINT32: 'uint32',
  /**
   * @type {string}
   * @const
   */
  UINT64: 'uint64',
  /**
   * @type {string}
   * @const
   */
  INT16: 'int16',
  /**
   * @type {string}
   * @const
   */
  INT32: 'int32',
  /**
   * @type {string}
   * @const
   */
  INT64: 'int64',
  /**
   * @type {string}
   * @const
   */
  FLOAT32: 'float32',
  /**
   * @type {string}
   * @const
   */
  FLOAT64: 'float64',
  /**
   * @type {string}
   * @const
   */
  COMPLEX64: 'complex64',
  /**
   * @type {string}
   * @const
   */
  COMPLEX128: 'complex128',
  /**
   * @type {string}
   * @const
   */
  STRING: 'string',
  /**
   * @type {string}
   * @const
   */
  ENUM: 'enum',
  /**
   * @type {string}
   * @const
   */
  TYPEOBJECT: 'typeobject',
  // Composite kinds
  /**
   * @type {string}
   * @const
   */
  ARRAY: 'array',
  /**
   * @type {string}
   * @const
   */
  LIST: 'list',
  /**
   * @type {string}
   * @const
   */
  SET: 'set',
  /**
   * @type {string}
   * @const
   */
  MAP: 'map',
  /**
   * @type {string}
   * @const
   */
  STRUCT: 'struct',
  /**
   * Union is like struct, but with only 1 field filled in.
   * @type {string}
   * @const
   */
  UNION: 'union',
};

module.exports = kind;
