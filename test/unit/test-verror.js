// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var verror = require('../../src/gen-vdl/v.io/v23/verror');
var Context = require('../../src/runtime/context').Context;
var VanadiumError = require('../../src/errors/vanadium-error');
var errors = Object.keys(verror);
errors.forEach(function(name) {
  test('verror.' + name, function(assert) {
    var Ctor = verror[name];
    var err = new Ctor(new Context());

    assert.ok(Ctor(new Context()) instanceof Ctor, 'should not require "new"'); // jshint ignore:line
    assert.ok(err instanceof Ctor, 'should be instanceof ' + name);
    assert.ok(err instanceof VanadiumError, 'should be instanceof VanadiumError'); // jshint ignore:line
    assert.ok(err instanceof Error, 'should be instanceof Error');
    assert.ok(err.stack, 'should have err.stack');
    assert.end();
  });
});
