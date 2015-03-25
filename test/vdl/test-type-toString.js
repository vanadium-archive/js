// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for toString in type.js and types.js
 */

var test = require('prova');
var testCases = require('./type-test-cases.js');

var Type = require('./../../src/vdl/type.js');

test('Type.toString', function(t) {
  for (var i = 0; i < testCases.length; i++) {
    var testType = testCases[i].type;
    if (!(testType instanceof Type)) {
      testType = new Type(testType);
    }
    t.equal(
      testType.toString(),
      testCases[i].toString,
      testCases[i].toString + ' matches'
    );
  }
  t.end();
});
