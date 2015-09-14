// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var LANG_KEY = require('../../src/runtime/shared-context-keys').LANG_KEY;
var dispatcher = leafDispatcher({
  test: function(ctx, serverCall) {
    return ctx.value(LANG_KEY);
  }
}, function auth(ctx, call) {
  if (ctx.value(LANG_KEY) !== 'my-lang') {
    throw new Error('bad lang ' + ctx.value(LANG_KEY));
  }
});
test('Test language in context', function(assert) {
  serve('context', dispatcher, function(err, res, end) {
    assert.error(err, 'should not error on serve(...)');
    var client = res.runtime.getClient();
    var ctx = res.runtime.getContext().withValue(LANG_KEY, 'my-lang');
    client.bindTo(ctx, 'context').then(function(service) {
      return service.test(ctx);
    }).then(function(lang) {
      assert.equal(lang, 'my-lang');
      res.end(assert);
    }).catch(function(err) {
      assert.error(err);
      res.end(assert);
    });
  });
});
