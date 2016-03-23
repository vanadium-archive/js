// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');

var random = require('../../src/lib/random');

var hexChars = '0123456789abcdef';
function isHexString(s) {
  if (typeof s !== 'string') {
    return false;
  }
  for (var i = 0; i < s.length; i++) {
    if (hexChars.indexOf(s[i]) < 0) {
      return false;
    }
  }
  return true;
}

test('random.int32()', function(t) {
  t.ok(typeof random.int32() === 'number', 'returns a number');
  t.end();
});

test('random.hex(l)', function(t) {
  ([1, 2, 7, 8, 16, 100]).forEach(function(i) {
    var s = random.hex(i);
    t.ok(isHexString(s), 'returns a hex string');
    t.ok(s.length === i, 'of length ' + i);
  });
  t.end();
});
