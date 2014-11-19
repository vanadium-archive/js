var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
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
  remoteBlessings: {},
  remoteBlessingStrings: ['test']
};

function contains(actual, expected, assert) {
  for (var key in expected) {
    if (!expected.hasOwnProperty(key)) {
      continue;
    }
    assert.deepEqual(actual.get(key), expected[key]);
  }
}

test('$suffix - ', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.bindTo(ctx, 'a/b/foo', function(err, service) {
      assert.error(err);

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err);
        assert.equal(suffix, 'foo');
        res.end(assert);
      });
    });
  });
});

test('$suffix - empty', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.bindTo(ctx, 'a/b', function(err, service) {
      assert.error(err);

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err);
        assert.equal(suffix, '');
        res.end(assert);
      });
    });
  });
});

test('$suffix - nested', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.bindTo(ctx, 'a/b/parent/suf', function(err, service) {
      assert.error(err);

      service.getSuffix(ctx, function(err, suffix) {
        assert.error(err);
        assert.equal(suffix, 'parent/suf');
        res.end(assert);
      });
    });
  });
});

test('$name', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.bindTo(ctx, 'a/b/suf', function(err, service) {
      assert.error(err);

      service.getName(ctx, function(err, name) {
        assert.error(err);
        assert.equal(name, 'suf');
        res.end(assert);
      });
    });
  });
});

test('$context', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.bindTo(ctx, 'a/b/suf', function(err, service) {
      assert.error(err);

      service.getContext(ctx, function(err, context) {
        assert.error(err);

        // remove the key attribute before comparison
        context.get('remoteBlessings').delete('key');

        contains(context, expectedContext, assert);
        res.end(assert);
      });
    });
  });
});

test('$context - mixed with normal args', function(assert) {
  var ctx = context.Context();
  serve(ctx, 'a/b', dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.bindTo(ctx, 'a/b/suf', function(err, service) {
      assert.error(err);

      service
      .getContextMixedWithNormalArgs(
        ctx, '-a-','-b-','-c-', function(err, results) {
        assert.error(err);

        // remove the key attribute before comparison
        results.get('context').get('remoteBlessings').delete('key');

        contains(results, {
          a1: '-a-',
          a2: '-b-',
          a3: '-c-'
        }, assert);
        contains(results.get('context'), expectedContext, assert);
        res.end(assert);
      });
    });
  });
});
