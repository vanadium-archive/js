// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');

// Services that handles anything in a/b/* where b is the service name
var dispatcher = leafDispatcher({
  getSuffix: function(ctx) {
    return ctx.suffix;
  },
  getContext: function(ctx, callback) {
    return ctx;
  },
  getArgs: function(ctx, a, b, c, $stream, cb) {
    var results = {
      context: ctx,
      a: a,
      b: b,
      c: c
    };

    cb(null, results);
  }
});

var expectedContext = {
  suffix: 'suf',
  remoteBlessings: {}
};

function contains(actual, expected, assert) {
  for (var key in expected) {
    if (!expected.hasOwnProperty(key)) {
      continue;
    }
    assert.deepEqual(actual[key], expected[key]);
  }
}

var defaultBlessingRegex = require('./default-blessing-regex');

function blessingStringsMatch(strings, regex, assert) {
  assert.ok(strings.length > 0, 'Context has strings');

  for (var i = 0; i < strings.length; i++) {
    assert.ok(regex.test(strings[i]),
        'string[' + i + '] matches expected name');
  }
}

function validateEndpoint(ep, assert) {
  assert.ok(typeof ep === 'string',
            'Endpoint should be string');
  assert.ok(ep !== '', 'endpoint should not be empty');
}

function validateContext(ctx, assert) {
  blessingStringsMatch(ctx.localBlessingStrings, defaultBlessingRegex,
                         assert);
  blessingStringsMatch(ctx.remoteBlessingStrings, defaultBlessingRegex,
                         assert);
  validateEndpoint(ctx.localEndpoint, assert);
  validateEndpoint(ctx.remoteEndpoint, assert);
}

test('Test non-empty suffix is available in context', function(assert) {
  serve('a/b', dispatcher, function(err, res, end) {
    assert.error(err, 'should not error on serve(...)');
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'a/b/foo', function(err, service) {
      assert.error(err, 'should not error on runtime.bindTo(...)');

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err, 'should not error on getSuffix(...)');
        assert.equal(suffix, 'foo');
        end(assert);
      });
    });
  });
});

test('Test empty suffix is available in context - ', function(assert) {
  serve('a/b', dispatcher, function(err, res, end) {
    assert.error(err, 'should not error on serve(...)');

    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'a/b', function(err, service) {
      assert.error(err, 'should not error on runtime.bindTo(...)');

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err, 'should not error on getSuffix(...)');
        assert.equal(suffix, '');
        end(assert);
      });
    });
  });
});

test('Test nested suffix /parent/suffix ', function(assert) {
  serve('a/b', dispatcher, function(err, res, end) {
    assert.error(err, 'should not error on serve(...)');
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'a/b/parent/suf', function(err, service) {
      assert.error(err, 'should not error on runtime.bindTo(...)');

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err, 'should not error on getSuffix(...)');
        assert.equal(suffix, 'parent/suf');
        end(assert);
      });
    });
  });
});

test('Test context object', function(assert) {
  serve('a/b', dispatcher, function(err, res, end) {
    assert.error(err, 'should not error on serve(...)');

    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'a/b/suf', function(err, service) {
      assert.error(err, 'should not error on runtime.bindTo(...)');

      service.getContext(ctx, function(err, context) {
        assert.error(err, 'should not error on getContext(...)');
        contains(context, expectedContext, assert);
        validateContext(context, assert);
        end(assert);
      });
    });
  });
});

test('Test context object and injected stream', function(assert) {
  serve('a/b', dispatcher, function(err, res, end) {
    assert.error(err, 'should not error on serve(...)');

    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    client.bindTo(ctx, 'a/b/suf', function(err, service) {
      assert.error(err, 'should not error on runtime.bindTo(...)');

      service.getArgs(ctx, '-a-','-b-','-c-', function(err, results) {
        assert.error(err, 'service.getArgs(...) should not error');

        contains(results, {
          a: '-a-',
          b: '-b-',
          c: '-c-'
        }, assert);

        var context = results.context;
        contains(context, expectedContext, assert);
        validateContext(context, assert);
        end(assert);
      });
    });
  });
});
