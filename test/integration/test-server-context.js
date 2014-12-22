var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
var context = require('../../src/runtime/context');
// Services that handles anything in a/b/* where b is the service name
var dispatcher = leafDispatcher({
  getSuffix: function($suffix) {
    return $suffix;
  },
  getName: function($name) {
    return $name;
  },
  getContext: function($context) {
    $context.remoteBlessings._id = undefined;
    return $context;
  },
  getContextMixedWithNormalArgs: function(a1, $context, a2, $cb, a3) {
    $context.remoteBlessings._id = undefined;
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
function remoteBlessingStringsContain(ctx, name, assert) {
  var remoteBlessingStrings = ctx.remoteBlessingStrings;
  assert.ok(remoteBlessingStrings.length > 0,
      'Context has remoteBlessingStrings');

  for (var i = 0; i < remoteBlessingStrings.length; i++) {
    assert.ok(remoteBlessingStrings[i].indexOf(name) >= 0,
        'ctx.remoteBlessingString[' + i + '] matches expected name');
  }
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

        // remove the key attribute before comparison
        delete context.remoteBlessings['key'];

        contains(context, expectedContext, assert);
        remoteBlessingStringsContain(context, defaultBlessingName, assert);
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

        // remove the key attribute before comparison
        delete results.context.remoteBlessings['key'];

        contains(results, {
          a1: '-a-',
          a2: '-b-',
          a3: '-c-'
        }, assert);

        var context = results.context;
        contains(context, expectedContext, assert);
        remoteBlessingStringsContain(context, defaultBlessingName, assert);
        res.end(assert);
      });
    });
  });
});
