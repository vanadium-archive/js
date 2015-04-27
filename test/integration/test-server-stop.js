// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var serve = require('./serve');
var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var dispatcher = leafDispatcher({
  foo: function(ctx, serverCall) {
    return 'bar';
  }
});
var name = 'my-test/service';

test('Test stopping a JS service - ' +
  'server.stop(callback)', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    res.server.stop(function(err) {
      assert.error(err);

      var ctx = res.runtime.getContext().withTimeout(100);
      res.service.foo(ctx, function(err, result) {
        assert.ok(err, 'should fail');
        res.end(assert);
      });
    });
  });
});


test('Test stopping a JS service - ' +
  'var promise = server.stop()', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    var ctx = res.runtime.getContext().withTimeout(100);
    res.server.stop()
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

test('Test re-serving a stopped JS service - ' +
  'server.stop(callback), runtime.serve(callback)', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    var server = res.server;
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    server.stop(function(err) {
      assert.error(err);

      server.serveDispatcher(name, dispatcher, function(err) {
        assert.error(err);

        client.bindTo(ctx, name, function(err, service) {
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
  'var promise = server.stop(), runtime.serve()', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    var server = res.server;
    var client = res.runtime.newClient();
    var ctx = res.runtime.getContext();
    server.stop()
    .then(function() {
      return server.serveDispatcher(name, dispatcher);
    })
    .then(function() {
      return client.bindTo(ctx, name);
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
  'server.stop(callback)', function(assert) {
  serve(name, dispatcher, function(err, res) {
    assert.error(err);

    res.server.stop(function(err) {
      assert.error(err);

      res.server.stop(function(err) {
        assert.error(err);
        res.end(assert);
      });
    });
  });
});
