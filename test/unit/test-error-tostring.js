// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var verror = require('../../src/gen-vdl/v.io/v23/verror');

test('Working toString on BadArgError (a VanadiumError)', function(t) {
  t.equal(new verror.BadArgError(null, 'an arg').toString(),
    'Error: app:op: Bad argument: an arg',
    'UnknownError has the expected toString value');
  t.end();
});
