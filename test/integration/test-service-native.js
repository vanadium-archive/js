// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var service = require('./get-service');
var makeError = require('../../src/errors/make-errors');
var actions = require('../../src/errors/actions');

var E = makeError('randomPrefix.verror', actions.NO_RETRY,
                  '{1} {2}: RandomError: {_}');

test('Test PassTime of Go native service', function(assert) {
  service('test_service/native', function(err, ctx, native, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }
    var now = new Date();
    native.passTime(ctx, now, function(err, result) {
      assert.error(err);
      assert.ok(result instanceof Date, 'native type is returned');
      var diff = Math.abs(result - now);
      // It might be ok to do an equals on the two date objects but because
      // Numbers are floating point and there is some amount of math to do
      // the conversion, === on these dates might not be true even when the
      // dates are really the same.
      assert.ok(diff < 1);
      end(assert);
    });
  });
});

test('Test PassError of Go native service', function(assert) {
  service('test_service/native', function(err, ctx, native, end) {
    assert.error(err);
    if (err) {
      return end(assert);
    }
    var e = new E(null, 'extra string', 4, false);
    var expectedMessage = 'app op: RandomError: extra string 4 false';
    native.passError(ctx, e, function(err, result) {
      // Bluebird adds __stackCleaned__ as part of its processing but it
      // doesn't show up in the vom decoded message, so we can't do a
      // deepEqual.
      assert.equal(e.id, err.id);
      assert.equal(e.retryCode, err.retryCode);
      assert.equal(e.msg, err.msg);
      assert.equal(e.message, err.message);
      assert.equal(e.msg, expectedMessage);
      assert.equal(e.message, expectedMessage);
      // The decoded error has the paramList values wrapped, since the
      // paramList is a list of any.  The error passed into the call
      // does not have that wrapping.  We add the wrapping to e to make sure
      // the decoded error has the wrapped paramlist.
      // Note: 'extra string', 4, and false are native values. They would
      // normally be converted to JSValue since the paramList is []any. However,
      // they are specifically guessed to be string, number, and bool in order
      // to avoid revealing JSValue to other languages in the common case.
      // https://github.com/veyron/release-issues/issues/1560
      e.paramList = e.paramList.map(function (v) { return { val: v }; });
      assert.deepEqual(e.paramList, err.paramList);
      end(assert);
    });
  });
});
