// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');

// Services that handles anything in a/b/* where b is the service name
var service = {
  getSuffix: function(ctx, serverCall) {
    return serverCall.securityCall.suffix;
  },
  getContext: function(ctx, serverCall) {
    return serverCall;
  },
  getArgs: function(ctx, serverCall, a, b, c, $stream, cb) {
    var results = {
      call: serverCall,
      a: a,
      b: b,
      c: c
    };

    cb(null, results);
  }
};

function dispatcher(suffix, cb) {
  cb(null, {
      service: service
  });
}

var expectedContext = {
  suffix: 'suf',
  methodTags: []
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

function validateContext(call, assert) {
  blessingStringsMatch(call.localBlessingStrings, defaultBlessingRegex,
                         assert);
  blessingStringsMatch(call.remoteBlessingStrings, defaultBlessingRegex,
                         assert);
  validateEndpoint(call.localEndpoint, assert);
  validateEndpoint(call.remoteEndpoint, assert);
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

      service.getContext(ctx, function(err, call) {
        assert.error(err, 'should not error on getContext(...)');
        contains(call.securityCall, expectedContext, assert);
        validateContext(call.securityCall, assert);
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

        var call = results.call.securityCall;
        contains(call, expectedContext, assert);
        validateContext(call, assert);
        end(assert);
      });
    });
  });
});
