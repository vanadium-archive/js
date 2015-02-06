/**
 * @fileoverview Constructor for Type. This is temporary and the type registry
 * should be used in its place.
 * TODO(alexfandrianto): If this is temporary, how can type registry take the
 * place of the Type Constructor?
 */

module.exports = Type;

var Kind = require('./kind');

/**
 * Creates a new Type.
 * Without o, the Type is incomplete and must be filled in further.
 * Notably, each type has a Kind, which implies the existence of other fields.
 * Type can be optionally constructed with an object, which has the option of
 * being canonicalized.
 * Note: Sidesteps a cyclic dependency with injection. During module setup,
 * any calls to the Type constructor with a type object should also set
 * skipValidation to true.
 * @param {Object=} o An object whose fields match those of a TypeObject.
 * @param {boolean=} skipValidation Flag to skip validation. Defaults to false.
 */
function Type(o, skipValidation) {
  if (o === undefined) {
    o = {};
  } else if (!skipValidation) {
    // Canonicalize the given type object.
    var canonicalize = require('./canonicalize');
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
Type.prototype._type.kind = Kind.TYPEOBJECT;
Type.prototype.equals = function(other) {
  if (this === other) {
    return true;
  }
  return this.name === other.name && (other instanceof Type) &&
    this.toString() === other.toString();
};

/**
 * @return {string} The human-readable string for this type
 */
Type.prototype.toString = function() {
  /* TODO(alexfandrianto): unique is never set on a type.
   * Go sets unique in the type constructor during registration.
   * Their registry uses uniqueTypeStr, so we should replace stringify too.
   * Do we also want to enforce uniqueTypeStr as being truly unique?
   */
  if (this.unique) {
    return this.unique;
  }
  return uniqueTypeStr(this, []);
};

/**
 * Compute a unique type string that breaks cycles.
 * Note: This logic replicates that of uniqueTypeStr in type_builder.go
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
    case Kind.OPTIONAL:
      return s + '?' + uniqueTypeStr(t.elem, seen);
    case Kind.ENUM:
      return s + 'enum{' + t.labels.join(';') + '}';
    case Kind.ARRAY:
      return s + '[' + t.len + ']' + uniqueTypeStr(t.elem, seen);
    case Kind.LIST:
      return s + '[]' + uniqueTypeStr(t.elem, seen);
    case Kind.SET:
      return s + 'set[' + uniqueTypeStr(t.key, seen) + ']';
    case Kind.MAP:
      return s + 'map[' + uniqueTypeStr(t.key, seen) + ']' +
        uniqueTypeStr(t.elem, seen);
    case Kind.STRUCT:
    case Kind.UNION:
      if (t.kind === Kind.STRUCT) {
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
      return s + Kind.kindStr(t.kind);
  }
}
