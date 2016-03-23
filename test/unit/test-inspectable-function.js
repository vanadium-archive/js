// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var InspectableFunction = require('../../src/lib/inspectable-function');

test('apply()', function(t) {
  var thisObj = {};
  function f(a, b) {
    t.equal(a, 'A', 'Expected A');
    t.equal(b, 'B', 'Expected B');
    t.equal(this, thisObj, 'Expected this to be thisObj');
    return 'Ret';
  }
  var inspectFn = new InspectableFunction(f);
  var ret = inspectFn.apply(thisObj, ['A', 'B']);
  t.equal(ret, 'Ret', 'Expected Ret');
  t.end();
});

test('ArgumentInspector methods work', function(t) {
  function f(ctx, a, b, cb) {}
  var inspectFn = new InspectableFunction(f);
  t.ok(inspectFn.hasCallback(), 'has callback');
  t.ok(inspectFn.contains('a'));
  t.notOk(inspectFn.contains('z'));
  t.end();
});