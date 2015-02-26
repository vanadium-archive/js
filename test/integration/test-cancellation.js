var test = require('prova');
var service = require('./get-service');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
var NO_TIMEOUT = require('../../src/ipc/constants').NO_TIMEOUT;
var CancelledError = require('../../src/runtime/context').CancelledError;


function run(ctx, err, collector, end, assert, id, runtime) {
  if (err) {
    return assert.end(err);
  }

  var timeout = 60 * 60 * 1000;
  ctx = ctx.withTimeout(timeout);

  collector.neverReturn(ctx, id).catch(function(err) {
    if (err.id !== 'CancelError') {
      assert.fail(err);
    }
  });

  ctx.waitUntilDone().catch(function(err) {
    assert.ok(err instanceof CancelledError);
  });
  var dctx = runtime.getContext().withTimeout(60000);
  collector.waitForStatus(dctx, id, 'running')
    .then(function(serverTimeout) {
      // Ensure that the server got the timeout we set.  We allow up to 10s
      // of network delay.
      if (serverTimeout > timeout || serverTimeout < timeout - 10000) {
        assert.fail('serverTimeout and timeout differ by too much.  ' +
                    'serverTimeout: ' + serverTimeout +
                    ' timeout: ' + timeout);
      }

      // Now cancel the call and check that the server call got cancelled.
      ctx.cancel();
      return collector.waitForStatus(dctx, id, 'cancelled');
    }).then(function(timeout) {
    }).catch(function(err) {
      assert.error(err);
    }).finally(function() {
      dctx.cancel();
      end(assert);
    });
}

function newDispatcher() {
  return leafDispatcher({
    callInfo: {},
    _processWaiters: function(key) {
      var info = this.callInfo[key];
      if (!info || !info.waiters) {
        return;
      }
      var remaining = [];
      for (var i = 0; i < info.waiters.length; i++) {
        var waiter = info.waiters[i];
        if (waiter.status === info.status) {
          waiter.cb(null, info.timeout);
        } else {
          remaining.push(info);
        }
      }
      info.waiters = remaining;
    },
    _onCancel: function(key, err) {
      var info = this.callInfo[key];
      info.status = 'cancelled';
      this._processWaiters(key);
      info.cb(err);
    },
    neverReturn: function(context, key, cb) {
      var info = this.callInfo[key];
      if (!info) {
        info = {};
        this.callInfo[key] = info;
      }
      info.status = 'running';
      info.timeout = NO_TIMEOUT;
      var deadline = context.deadline();
      if (deadline !== null) {
        info.timeout = deadline - Date.now();
      }
      info.cb = cb;
      this._processWaiters(key);

      var server = this;
      context.waitUntilDone().catch(function(err) {
        server._onCancel(key, err);
      });
    },
    waitForStatus: function(context, key, status, cb) {
      var info = this.callInfo[key];
      if (!info) {
        info = {
          status: 'unknown'
        };
        this.callInfo[key] = info;
      }
      if (status === info.status) {
        cb(null, info.timeout);
        return;
      }
      if (!info.waiters) {
        info.waiters = [];
      }
      info.waiters.push({status: status, cb: cb});
    }
  });
}

test('Test cancellation from JS client to Go server', function(assert) {
  service('test_service/serviceToCancel', function(err, ctx, collector, end,
                                                   runtime) {
    ctx = ctx.withCancel();
    run(ctx, err, collector, end, assert, 1, runtime);
  });
});

test('Test cancellation from JS client to JS server', function(assert) {
  serve('testing/serviceToCancel', newDispatcher(), function(err, res) {
    if (err) {
      assert.error(err);
      assert.end();
      return;
    }
    var ctx = res.runtime.getContext();
    run(ctx, err, res.service, res.end, assert, 2, res.runtime);
  });
});
