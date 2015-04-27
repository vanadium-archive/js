// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var createConstructor = require('./create-constructor.js');
var typeObjectFromKind = require('./type-object-from-kind.js');
var kind = require('./kind.js');
var Type = require('./type.js');
require('./es6-shim');

/**
 * @summary Maps types to corresponding constructors.
 *
 * @description
 * <p>Registered constructors convert a given value to a a vom-typed object.
 * There is no support for removing added constructors.</p>
 *
 * @constructor
 * @inner
 * @memberof module:vanadium.vdl
 */
function Registry() {
  this._builtinTypes = this._getBuiltinTypes();
  this._registeredTypes = {};
}

Registry.prototype._getBuiltinTypes = function() {
  var map = new Map();

  // Canonicalize uses structs to represent each kind of TypeObject. Thus, the
  // constructor for those structs should be Type.
  Object.keys(kind).forEach(function(key) {
    var k = kind[key];
    if (typeof k === 'string') {
      var typeOfType = typeObjectFromKind(k);
      map.set(typeOfType, Type);
    }
  });
  return map;
};

Registry.prototype._addConstructor = function(type, ctor) {
  if (!(type instanceof Type)) {
    type = new Type(type);
  }
  var str = type.toString();
  if (this._registeredTypes.hasOwnProperty(str)) {
    throw new Error(str + ' is already registered');
  }
  this._registeredTypes[str] = ctor;
};

Registry.prototype._lookupConstructor = function(type) {
  if (!(type instanceof Type)) {
    type = new Type(type);
  }
  // Special Case: Certain builtin types, matched via ===, use a specially
  // chosen constructor.
  if (this._builtinTypes.has(type)) {
    return this._builtinTypes.get(type);
  }

  var str = type.toString();
  if (this._registeredTypes.hasOwnProperty(str)) {
    return this._registeredTypes[str];
  }
  return null;
};

/**
 * Lookup a constructor. If it isn't found, then create a new one and register
 * it.
 * @param {module:vanadium.vdl.Type} type Type
 * @return {function} The constructor function for the type.
 */
Registry.prototype.lookupOrCreateConstructor = function(type) {
  if (!(type instanceof Type)) {
    type = new Type(type);
  }
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
