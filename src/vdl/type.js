// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Constructor for Type. This is temporary and the type registry
 * should be used in its place.
 * TODO(alexfandrianto): If this is temporary, how can type registry take the
 * place of the Type Constructor?
 * @private
 */

module.exports = Type;

var kind = require('./kind');
var canonicalize; // Must be lazily-required to avoid circular dependency.

/**
 * @summary Creates a new Type.
 *
 * @description <p>Without o, the Type is incomplete and must be filled in
 * further.</p>
 * <p>Notably, each type has a kind, which implies the existence of other
 * fields.  Type can be optionally constructed with an object, which has the
 * option of being canonicalized.</p>
 * <p>Note: This sidesteps a cyclic dependency with injection. During module
 * setup, any calls to the Type constructor with a type object should also set
 * skipValidation to true.</p>
 * @constructor
 * @memberof module:vanadium.vdl
 * @param {Object=} o An object whose fields match those of a TypeObject.
 * @param {boolean=} skipValidation Flag to skip validation. Defaults to false.
 */
function Type(o, skipValidation) {
  if (o === undefined) {
    o = {};
  } else if (!skipValidation) {
    // Canonicalize the given type object.
    canonicalize = canonicalize || require('./canonicalize');
    o = canonicalize.type(o);
  }
  this.name = '';

  // Copy over o's fields into this type.
  // Note: This is a shallow copy. If o is referenced cyclically, the reference
  // is lost. Use canonicalize.type instead.
  Object.keys(o).forEach(function(k) {
    this[k] = o[k];
  }, this);
}

Type.prototype._type = new Type();
Type.prototype._type.kind = kind.TYPEOBJECT;

/**
 * Checks for equality
 * @param {*} other The value to check for equality against.
 * @return {boolean} True iff other equals this.
 */
Type.prototype.equals = function(other) {
  if (this === other) {
    return true;
  }


  return other && this.name === other.name && (other instanceof Type) &&
    this.toString() === other.toString();
};

/**
 * Freeze a type, setting its _unique string.
 */
Type.prototype.freeze = function() {
  if (!Object.isFrozen(this)) {
    var descriptor = {
      value: this.toString()
    };
    Object.defineProperty(this, '_unique', descriptor);
    Object.freeze(this);
  }
};

/**
 * Get a human-readable string for this type.
 * @return {string} The human-readable string for this type
 */
Type.prototype.toString = function() {
  if (this._unique) {
    return this._unique;
  }
  return uniqueTypeStr(this, []);
};

/**
 * <p>Compute a unique type string that breaks cycles.</p>
 *
 * <p>Note: This logic replicates that of uniqueTypeStr in type_builder.go.</p>
 * @private
 * @param {Type} t The type whose unique type string is needed
 * @param {Array} seen A list of seen type references
 * @return {string} The string representation of the given type
 */
function uniqueTypeStr(t, seen) {
  if (seen.indexOf(t) !== -1 && t.name !== '') {
    return t.name;
  }
  seen.push(t);
  var s = t.name;
  if (s !== '') {
    s += ' ';
  }
  switch (t.kind) {
    case kind.OPTIONAL:
      return s + '?' + uniqueTypeStr(t.elem, seen);
    case kind.ENUM:
      return s + 'enum{' + t.labels.join(';') + '}';
    case kind.ARRAY:
      return s + '[' + t.len + ']' + uniqueTypeStr(t.elem, seen);
    case kind.LIST:
      return s + '[]' + uniqueTypeStr(t.elem, seen);
    case kind.SET:
      return s + 'set[' + uniqueTypeStr(t.key, seen) + ']';
    case kind.MAP:
      return s + 'map[' + uniqueTypeStr(t.key, seen) + ']' +
        uniqueTypeStr(t.elem, seen);
    case kind.STRUCT:
    case kind.UNION:
      if (t.kind === kind.STRUCT) {
        s += 'struct{';
      } else {
        s += 'union{';
      }
      t.fields.forEach(function (f, index) {
        if (index > 0) {
          s += ';';
        }
        s += f.name + ' ' + uniqueTypeStr(f.type, seen);
      });
      return s + '}';
    default:
      return s + t.kind;
  }
}
