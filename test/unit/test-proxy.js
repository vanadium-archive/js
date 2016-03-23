// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var Proxy = require('../../src/proxy');

test('creating instances', function(assert) {
  var proxy = new Proxy();

  assert.equal(typeof Proxy, 'function');
  assert.ok(proxy instanceof Proxy);
  assert.end();
});
