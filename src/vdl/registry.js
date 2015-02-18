var stringify = require('./stringify.js');
var createConstructor = require('./create-constructor.js');
var typeObjectFromKind = require('./type-object-from-kind.js');
var Kind = require('./kind.js');
var Type = require('./type.js');
require('./es6-shim');

/*
 * The Registry singleton maps types to corresponding constructors.
 * These constructors convert a given value to a a vom-typed object.
 * There is no support for removing added constructors.
 */
function Registry() {
  this._builtinTypes = this._getBuiltinTypes();
  this._registeredTypes = {};
}

Registry.prototype._getBuiltinTypes = function() {
  var map = new Map();

  // Canonicalize uses structs to represent each kind of TypeObject. Thus, the
  // constructor for those structs should be Type.
  Object.keys(Kind).forEach(function(key) {
    var kind = Kind[key];
    if (typeof kind === 'number') {
      var typeOfType = typeObjectFromKind(kind);
      map.set(typeOfType, Type);
    }
  });
  return map;
};

Registry.prototype._addConstructor = function(type, ctor) {
  var str = stringify(type);
  if (this._registeredTypes.hasOwnProperty(str)) {
    throw new Error(str + ' is already registered');
  }
  this._registeredTypes[str] = ctor;
};

Registry.prototype._lookupConstructor = function(type) {
  // Special Case: Certain builtin types, matched via ===, use a specially
  // chosen constructor.
  if (this._builtinTypes.has(type)) {
    return this._builtinTypes.get(type);
  }

  var str = stringify(type);
  if (this._registeredTypes.hasOwnProperty(str)) {
    return this._registeredTypes[str];
  }
  return null;
};

// Lookup a constructor or if it isn't found, create a new one and register it.
Registry.prototype.lookupOrCreateConstructor = function(type) {
  var lookupResult = this._lookupConstructor(type);
  if (lookupResult !== null) {
    return lookupResult;
  }

  var constructor = createConstructor(type);
  this._addConstructor(type, constructor);
  return constructor;
};

var globalRegistry = new Registry();
module.exports = globalRegistry;
