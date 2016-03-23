// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for registry.js
 */

var test = require('tape');

var registry = require('./../../src/vdl/registry.js');
var registryMultipleRequire = require('./../../src/vdl/registry.js');
var createConstructor = require('./../../src/vdl/create-constructor.js');

var kind = require('./../../src/vdl/kind.js');
var Type = require('./../../src/vdl/type.js');

function createNamedType(name, kind) {
  return new Type({
    name: name,
    kind: kind
  });
}

test('_addConstructor', function(t) {
  var foo = createNamedType('foo', kind.FLOAT32);
  var boo = createNamedType('boo', kind.BOOL);

  // Unique types do not throw.
  t.doesNotThrow(
    registry._addConstructor.bind(registry, foo, 'bar'),
    'add unique type => does not throw'
  );
  t.doesNotThrow(
    registry._addConstructor.bind(registry, boo, 'far'),
    'add unique type => does not throw'
  );

  // Duplicate types do throw.
  t.throws(
    registry._addConstructor.bind(registry, boo, 'bar'),
    'add duplicate type => throws'
  );
  t.end();
});

test('_lookupConstructor', function(t) {
  var notHere = createNamedType('noo', kind.STRING);

  // A missing type gets null.
  t.equal(registry._lookupConstructor(notHere), null,
    'lookup unused type => null');

  // An added type gets its constructor back.
  var type = createNamedType('through', kind.INT64);
  var constructor = 'czar';
  registry._addConstructor(type, constructor);
  t.equal(registry._lookupConstructor(type), constructor,
    'add(A, B) => lookup(A) => get B');

  // If we add another type, we get its constructor back instead.
  var type2 = createNamedType('loo', kind.UINT32);
  var constructor2 = 'jar';
  registry._addConstructor(type2, constructor2);
  t.equal(registry._lookupConstructor(type2), constructor2,
    'add(C, D) => lookup(C) => get D');

  // The first added type still gets its constructor back too.
  t.equal(registry._lookupConstructor(type), constructor,
    'Can add and lookup multiple constructors');

  t.end();
});

test('multiple require', function(t) {
  var type = createNamedType('glue', kind.STRUCT);
  var constructor = 'car';
  registry._addConstructor(type, constructor);
  t.equals(registryMultipleRequire._lookupConstructor(type), constructor,
    'All registry are the same singleton.');
  t.end();
});

test('lookupOrCreateConstructor', function(t) {
  var firstType = createNamedType('few', kind.INT32);
  var Constructor = registry.lookupOrCreateConstructor(firstType);
  var SameConstructor = registry.lookupOrCreateConstructor(firstType);
  t.equals(Constructor, SameConstructor);
  t.deepEquals(new Constructor(), new (createConstructor(firstType))());

  var secondType = createNamedType('chew', kind.STRING);
  var SecondConstructor = registry.lookupOrCreateConstructor(secondType);
  t.notEquals(Constructor, SecondConstructor);
  t.deepEquals(new SecondConstructor(), new (createConstructor(secondType))());
  t.end();
});
