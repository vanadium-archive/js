var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
var context = require('../../src/runtime/context');

function cleanupContext(ctx) {
  ctx.remoteBlessings._id = undefined;
  ctx.localBlessings._id = undefined;
  delete ctx.remoteBlessings['key'];
  delete ctx.localBlessings['key'];
}

// Services that handles anything in a/b/* where b is the service name
var dispatcher = leafDispatcher({
  getSuffix: function($suffix) {
    return $suffix;
  },
  getName: function($name) {
    return $name;
  },
  getContext: function($context) {
    cleanupContext($context);
    return $context;
  },
  getContextMixedWithNormalArgs: function(a1, $context, a2, $cb, a3) {
    cleanupContext($context);
    $cb(null,
      {a1: a1,
       context: $context,
       a2: a2,
       a3: a3});
  }
});

var expectedContext = {
  name: 'suf',
  suffix : 'suf',
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

var defaultBlessingName = require('./default-blessing-name');

// TODO(nlacasse): Clean this up once all tests require real authentication.
function blessingStringsContain(strings, name, assert) {
  assert.ok(strings.length > 0,
      'Context has strings');

  for (var i = 0; i < strings.length; i++) {
    assert.ok(strings[i].indexOf(name) >= 0,
        'string[' + i + '] matches expected name');
  }
}

function validateEndpoint(ep, assert) {
  assert.ok(typeof ep === 'string',
            'Endpoint should be string');
  assert.ok(ep !== '', 'endpoint should not be empty');
}

function validateContext(ctx, assert) {
  blessingStringsContain(ctx.localBlessingStrings, defaultBlessingName,
                         assert);
  blessingStringsContain(ctx.remoteBlessingStrings, defaultBlessingName,
                         assert);
  validateEndpoint(ctx.localEndpoint, assert);
  validateEndpoint(ctx.remoteEndpoint, assert);
}

test('Test non-empty suffix is available in context - ' +
  '- $suffix', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'a/b/foo', function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err);
        assert.equal(suffix, 'foo');
        res.end(assert);
      });
    });
  });
});

test('Test empty suffix is available in context - ' +
  '$suffix', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'a/b', function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err);
        assert.equal(suffix, '');
        res.end(assert);
      });
    });
  });
});

test('Test nested suffix such as /parent/suffix is available in context - ' +
  '$suffix', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'a/b/parent/suf', function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err);
        assert.equal(suffix, 'parent/suf');
        res.end(assert);
      });
    });
  });
});

test('Test name is available in context -' +
  '$name', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'a/b/suf', function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.getName(ctx, function(err, name) {
        assert.error(err);
        assert.equal(name, 'suf');
        res.end(assert);
      });
    });
  });
});

test('Test $context object containing all context variables is injected - ' +
  '$context', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'a/b/suf', function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service.getContext(ctx, function(err, context) {
        assert.error(err);

        contains(context, expectedContext, assert);
        validateContext(context, assert);
        res.end(assert);
      });
    });
  });
});

test('Test $context object and individual context variables such as $name ' +
  'and $suffix can be injected together', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    if (err) {
      return assert.end(err);
    }

    res.runtime.bindTo(ctx, 'a/b/suf', function(err, service) {
      if (err) {
        return assert.end(err);
      }

      service
      .getContextMixedWithNormalArgs(
        ctx, '-a-','-b-','-c-', function(err, results) {
        assert.error(err);


        contains(results, {
          a1: '-a-',
          a2: '-b-',
          a3: '-c-'
        }, assert);

        var context = results.context;
        contains(context, expectedContext, assert);
        validateContext(context, assert);
        res.end(assert);
      });
    });
  });
});
