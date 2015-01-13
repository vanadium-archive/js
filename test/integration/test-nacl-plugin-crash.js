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
    res.service.anRpc(context.Context(), function(err, result) {
      t.notOk(err, 'Err expected to be null');
      t.equal(result, response, 'Expected different response from anRpc()');
      cb();
    });
  });
}

if (require('is-browser')) {
  var eventProxy = require('../../src/proxy/event-proxy');

  test('Test recovery from nacl plugin crash', function(t) {
    // validate comunication first, partially because this initializes the
    // nacl plugin.
    validateCommunication(t, 'test/name1', function() {
      // Handle the crash.
      eventProxy.once('error', vanadiumCrashEvent);

      var receivedError = false;

      function vanadiumCrashEvent(err) {
        if (!receivedError) {
          receivedError = true; // Assumes crash is first error.

          t.equal(typeof err, 'string',
            'Receive a string arg during the crash event');
          t.equal(err.indexOf('Vanadium plug-in crashed'), 0,
            'Received crash message');

          // Perform another communication validation.
          validateCommunication(t, 'test/name2', t.end);
        }
      }

      // Send a message triggering a nacl plug-in crash.
      eventProxy.send('intentionallyPanic');
    });
  });
}