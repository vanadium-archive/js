var test = require('prova');
var context = require('../../src/runtime/context');
var service = require('./get-service');
var serve = require('./serve');
var leafDispatcher = require('../../src/ipc/leaf_dispatcher');
var NO_TIMEOUT = require('../../src/ipc/constants').NO_TIMEOUT;

function run(err, collector, end, assert) {
  assert.error(err);

  var id = Math.floor(Math.random() * 1000000);
  var timeout = 60 * 60 * 1000;
  var ctx = new context.Context().withTimeout(timeout);

  collector.neverReturn(ctx, id).catch(function(err) {
    if (!(err instanceof context.CancelledError)) {
      assert.fail(err);
    }
  });

  var dctx = new context.Context().withTimeout(60000);
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

test('cancel: js client to go server', function(assert) {
  service('test_service/cancel', function(err, collector, end) {
    run(err, collector, end, assert);
  });
});

function newDispatcher() {
  return leafDispatcher({
    callInfo: {},
    processWaiters: function(key) {
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
    onCancel: function(key, err) {
      var info = this.callInfo[key];
      info.status = 'cancelled';
      this.processWaiters(key);
      info.cb(err);
    },
    neverReturn: function(key, $context, $cb) {
      var info = this.callInfo[key];
      if (!info) {
        info = {};
        this.callInfo[key] = info;
      }
      info.status = 'running';
      info.timeout = NO_TIMEOUT;
      var deadline = $context.deadline();
      if (deadline !== null) {
        info.timeout = deadline - Date.now();
      }
      info.cb = $cb;
      this.processWaiters(key);


      $context.waitUntilDone().catch(this.onCancel.bind(this, key));
    },
    waitForStatus: function(key, status, $cb) {
      var info = this.callInfo[key];
      if (!info) {
        info = {
          status: 'unknown'
        };
        this.callInfo[key] = info;
      }
      if (status === info.status) {
        $cb(null, info.timeout);
        return;
      }
      if (!info.waiters) {
        info.waiters = [];
      }
      info.waiters.push({status: status, cb: $cb});
    }
  });
}

test('cancel: js client to js server', function(assert) {
  serve('testing/cancel', newDispatcher(), function(err, res) {
    run(err, res.service, res.end, assert);
  });
});
