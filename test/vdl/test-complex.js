// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var Complex = require('./../../src/vdl/complex');

test('toString', function(assert) {
  assert.equal((new Complex(1, -3)).toString(), '1 - 3i');
  assert.equal((new Complex(1, 5)).toString(), '1 + 5i');
  assert.equal((new Complex(4, 0)).toString(), '4');
  assert.equal((new Complex(0, 3)).toString(), '3i');
  assert.equal((new Complex(1, 1)).toString(), '1 + i');
  assert.equal((new Complex(1, -1)).toString(), '1 - i');
  assert.end();
});

test('add', function(assert) {
  var c1 = new Complex(1, 3);
  var c2 = new Complex(3, -2);
  assert.equal(c1.add(c2).toString(), '4 + i');
  assert.equal(c1.add(c2).toString(), '4 + i');
  assert.end();
});

test('subtract', function(assert) {
  var c1 = new Complex(1, 3);
  var c2 = new Complex(3, -2);
  assert.equal(c1.subtract(c2).toString(), '-2 + 5i');
  assert.equal(c2.subtract(c1).toString(), '2 - 5i');
  assert.end();
});

test('multiply', function(assert) {
  var c1 = new Complex(1, 3);
  var c2 = new Complex(3, -2);
  assert.equal(c1.multiply(c2).toString(), '9 + 7i');
  assert.equal(c2.multiply(c1).toString(), '9 + 7i');
  assert.end();
});

test('divide', function(assert) {
  var c1 = new Complex(3, 3);
  var c2 = new Complex(1, -1);
  assert.equal(c1.divide(c2).toString(), '3i');
  assert.end();
});
