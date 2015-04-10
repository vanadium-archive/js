// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');

var leafDispatcher = require('../../src/rpc/leaf-dispatcher');
var serve = require('./serve');

// Test serving and making an RPC call.
// name is the name of the service to serve and cb is called after completion.
function validateCommunication(t, name, cb) {
  var response = 5;

  var dispatcher = leafDispatcher({
    anRpc: function(context, cb) {
      cb(null, response);
    }
  });

  serve(name, dispatcher, function(err, res) {
    if (err) {
      return cb(err);
    }

    res.service.anRpc(res.runtime.getContext(), function(err, result) {
      t.error(err, 'Err expected to be null');
      t.equal(result, response, 'Expected different response from anRpc()');
      cb(null, res.close, res.runtime);
    });
  });
}

// TODO(nlacasse,bjornick): This test is flakey and sometimes hangs.  It appears
// as though the nacl plugin deadlocks during panic, and a 'crash' event is
// never emitted from the nacl element, preventing the JavaScript from detecting
// the crash.  We should figure out why this happens sometimes, and re-enable
// the test once it is fixed.
test.skip('Test recovery from nacl plugin crash', function(t) {
  if (!require('is-browser')) {
    return t.end();
  }

  var errors = require('../../src/verror/index');
  var eventProxy = require('../../src/browser/event-proxy');

  // validate comunication first, partially because this initializes the
  // nacl plugin.
  validateCommunication(t, 'test/name1', function(err, close1, runtime) {
    if (err) {
      return t.end(err);
    }

    // Handle the crash.
    runtime.once('crash', function(err) {
      t.ok(err instanceof errors.ExtensionCrashError,
        'Receive ExtensionCrashError object.');

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
    });

    // Send a message triggering a nacl plug-in crash.
    eventProxy.send('intentionallyPanic');
  });
});
