// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var vanadium = require('../../');
var config = require('./default-config');

module.exports = service;

// DRYs up test code by wrapping the default success case for:
//
//    vanadium.init() -> runtime.bindTo() -> assertions -> runtime.close()
//
// To make a connection to the default integration test wspr instance and
// bind to a service use:
//
//     service('test_service/cache', function(err, ctx, cache, end, runtime) {
//       assert.error(err)
//
//       // your assertions here...
//
//       // use the `end` function to close the underlying runtime/wspr
//       // connection and end your test run.
//       end(assert)
//     })
//
function service(name, callback) {
  vanadium.init(config, function(err, runtime) {
    if (err) {
      return callback(err);
    }

    var ctx = runtime.getContext();
    runtime.getClient().bindTo(ctx, name, function(err, service) {
      callback(err, ctx, service, end, runtime);
    });

    // hoisted and passed as the last argument to the callback argument.
    function end(assert) {
      if (typeof assert === 'function') {
        return runtime.close(assert);
      } else if (!! assert.end && typeof assert.end === 'function') {
        return runtime.close(function(err) {
          assert.error(err, 'should not error on runtime.close(...)');
          assert.end();
        });
      } else {
        var message = 'end(callback) requires a callback or assert object';
        throw new Error(message);
      }
    }
  });
}
