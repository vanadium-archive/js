var test = require('prova');

var leafDispatcher = require('../../src/ipc/leaf-dispatcher');
var context = require('../../src/runtime/context');
var serve = require('./serve');

// Test serving and making an RPC call.
// name is the name of the service to serve and cb is called after completion.
function validateCommunication(t, name, cb) {
  var response = 5;

  var serveCtx = context.Context();
  var dispatcher = leafDispatcher({
    anRpc: function(context, cb) {
      cb(null, response);
    }
  });

  serve(serveCtx, name, dispatcher, function(err, res) {
    if (err) {
      return cb(err);
    }

    res.service.anRpc(context.Context(), function(err, result) {
      t.error(err, 'Err expected to be null');
      t.equal(result, response, 'Expected different response from anRpc()');
      cb(null, res.end);
    });
  });
}

test('Test recovery from nacl plugin crash', function(t) {
  if (!require('is-browser')) {
    return t.end();
  }

  var eventProxy = require('../../src/proxy/event-proxy');

  // validate comunication first, partially because this initializes the
  // nacl plugin.
  validateCommunication(t, 'test/name1', function(err, close1) {
    if (err) {
      t.error(err);
      return t.end();
    }

    // Handle the crash.
    eventProxy.once('crash', vanadiumCrashEvent);

    var receivedError = false;

    function vanadiumCrashEvent(err) {
      if (!receivedError) {
        receivedError = true; // Assumes crash is first error.

        t.equal(typeof err, 'string',
          'Receive a string arg during the crash event');
        t.equal(err.indexOf('Vanadium plug-in crashed'), 0,
          'Received crash message');

        // Perform another communication validation.
        validateCommunication(t, 'test/name2', function(err, close2) {
          if (err) {
            t.error(err);
            return close1(t.end);
          }

          close1(function(err1) {
            close2(function(err2) {
              t.end(err1 && err2);
            });
          });
        });
      }
    }

    // Send a message triggering a nacl plug-in crash.
    eventProxy.send('intentionallyPanic');
  });
});