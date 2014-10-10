var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
var dispatcher = leafDispatcher({
  foo: function() {
    return 'bar';
  }
});
var name = 'my-test/service';

test('server.stop(callback)', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    res.server.stop(function(err) {
      assert.error(err);

      res.service.foo(function(err, result) {
        assert.ok(err, 'should fail');
        res.end(assert);
      });
    });
  });
});

test('var promise = server.stop()', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    res.server.stop()
    .then(function() {
      return res.service.foo();
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
// test('server.stop(vallback) - re-serve a stopped server', function(assert) {
//   serve(name, dispatcher, function(err, runtime, end) {
//     assert.error(err);
//
//     runtime.bindTo(name, function(err, service) {
//       assert.error(err);
//
//       var server = runtime._getServer()
//
//       server.stop(function(err) {
//         assert.error(err);
//
//         server.serve(name, dispatcher, function(err) {
//           assert.error(err);
//
//           runtime.bindTo(name, function(err, remote) {
//             remote.foo(function(err, result) {
//               assert.error(err);
//
//               assert.equal(result, 'bar')
//               end(assert)
//             })
//           })
//         })
//       })
//     })
//   })
// })

test('var promise = server.stop() - re-serve', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    res.server.stop()
    .then(function() {
      return res.server.serve(name, dispatcher);
    })
    .then(function() {
      return res.runtime.bindTo(name);
    })
    .then(function(service) {
      return service.foo();
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

test('server.stop() - called twice', function(assert) {
  serve(name, dispatcher, function(err, res) {
    res.server.stop(function(err) {
      assert.error(err);

      res.server.stop(function(err) {
        assert.error(err);
        res.end(assert);
      });
    });
  });
});
