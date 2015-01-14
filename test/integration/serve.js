var veyron = require('../../');
var config = require('./default-config');
var extend = require('xtend');
var defaults = {
  autoBind: true
};

module.exports = serve;

// # serve(ctx, name, dispatcher, callback)
//
// DRYs up test code by wrapping the default success case for:
//
//    veyron.init() ->
//    runtime.server(name, dispatcher, ...) ->
//    runtime.bindTo(ctx, name, ...) -> r
//    assertions ->
//    untime.close()
//
// To make a connection to the default integration test wspr instance and
// bind to a service use:
//
//     var ctx = context.Context()
//     serve(ctx, 'test/service', dispatcher, function(err, res) {
//       res.service.returnBuiltInError(function(err) {
//         assert.error(err)
//
//         // your assertions here...
//
//         // `res` has several attributes to make your life easier:
//         //
//         // * runtime: veyron runtime object
//         // * config: config passed into veyron.init()
//         // * server: returned from runtime._getServer()
//         // * service: returned from runtime.bindTo(name, ...)
//         // * end: the end function to shut down the connection
//
//
//         // use the `res.end` function to close the underlying runtime/wspr
//         // connection and end your test run.
//         res.end(assert);
//       })
//     })
//
function serve(ctx, name, dispatcher, callback) {
  var options = defaults;

  // alternate: serve(options, callback)
  if (typeof name === 'object') {
    options = extend(defaults, name);
    callback = dispatcher;
    name = options.name;
    dispatcher = options.dispatcher;
  }

  veyron.init(config, function(err, runtime) {
    if (err) {
      return callback(err);
    }

    runtime.serveDispatcher(name, dispatcher, function(err) {
      if (err) {
        return callback(err);
      }

      waitUntilResolve();

      // The server is not gauranteed to be mounted by the time the serve
      // call finishes.  We should wait until the name resolves before calling
      // the callback.  As a side a benefit, this also speeds up the browser
      // tests, because browspr is quicker than wspr and so it is more likely
      // to return before the server is mounted.  The normal backoff for bindTo
      // starts at 100ms, but this code only waits a few milliseconds.
      function waitUntilResolve() {
        var ns = runtime.namespace();
        var count = 0;
        runResolve();
        function runResolve() {
          ns.resolve(name, function(err, s) {
            if (err || s.length === 0) {
              count++;
              if (count === 10) {
                return callback(err);
              }
              return setTimeout(runResolve, 10);
            }
            completeServe();
          });
        }
      }
      function completeServe() {
        var res = {
          runtime: runtime,
          config: config,
          end: end
        };

        if (options.autoBind === false) {
          return callback(err, res, end);
        }

        function onBind(err, service) {
          if (err) {
            return callback(err);
          }

          res.service = service;

          callback(err, res, end);
        }

        if (ctx) {
          runtime.bindTo(ctx, name, onBind);
        } else {
          runtime.bindTo(name, onBind);
        }
      }
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
