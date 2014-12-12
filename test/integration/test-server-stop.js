var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
var context = require('../../src/runtime/context');
var dispatcher = leafDispatcher({
  foo: function() {
    return 'bar';
  }
});
var name = 'my-test/service';

test('Test stopping a JS service - ' +
  'runtime.stop(callback)', function(assert) {
  var ctx = context.Context();
  serve(ctx, name, dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.stop(function(err) {
      assert.error(err);

      res.service.foo(ctx, function(err, result) {
        assert.ok(err, 'should fail');
        res.end(assert);
      });
    });
  });
});


test('Test stopping a JS service - ' +
  'var promise = runtime.stop()', function(assert) {
  var ctx = context.Context();
  serve(ctx, name, dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.stop()
    .then(function() {
      return res.service.foo(ctx);
    })
    .then(function() {
      assert.fail('should not succeed');
      res.end(assert);
    }, function(err) {
      assert.ok(err, 'should fail');
      res.end(assert);
    })
    .catch(function(err) {
      assert.error(err);
      res.end(assert);
    });
  });
});

// TODO(jasoncampbell): At the time this was written the callback case
// triggered some hard to trackdown error cases, come back and fix it after
// the tests get ported: https://paste.googleplex.com/5916393484582912
// TODO(aghassemi) Look into this.
test.skip('Test re-serving a stopped JS service - ' +
  'server.stop(callback), runtime.serve(callback)', function(assert) {
  var ctx = context.Context();
  serve(ctx, name, dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.stop(function(err) {
      assert.error(err);

      res.runtime.serveDispatcher(name, dispatcher, function(err) {
        assert.error(err);

        res.runtime.bindTo(ctx, name, function(err, service) {
          assert.error(err);

          service.foo(ctx, function(err, result) {
            assert.error(err);

            assert.equal(result, 'bar');
            res.end(assert);
          });
        });
      });
    });
  });
});

test('Test re-serving a stopped JS service - ' +
  'var promise = runtime.stop(), runtime.serve()', function(assert) {
  var ctx = context.Context();
  serve(ctx, name, dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.stop()
    .then(function() {
      return res.runtime.serveDispatcher(name, dispatcher);
    })
    .then(function() {
      return res.runtime.bindTo(ctx, name);
    })
    .then(function(service) {
      return service.foo(ctx);
    })
    .then(function(result) {
      assert.equal(result, 'bar');
      res.end(assert);
    })
    .catch(function(err) {
      assert.error(err);
      res.end(assert);
    });
  });
});

test('Test stopping a JS service twice - ' +
  'runtime.stop(callback)', function(assert) {
  var ctx = context.Context();
  serve(ctx, name, dispatcher, function(err, res) {
    assert.error(err);

    res.runtime.stop(function(err) {
      assert.error(err);

      res.runtime.stop(function(err) {
        assert.error(err);
        res.end(assert);
      });
    });
  });
});
