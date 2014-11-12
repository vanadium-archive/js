var veyron = require('../../');
var config = require('./default-config');
var extend = require('xtend');
var defaults = {
  autoBind: true
};

module.exports = serve;

// # serve(name, dispatcher, callback)
//
// DRYs up test code by wrapping the default success case for:
//
//    veyron.init() ->
//    runtime.server(name, dispatcher, ...) ->
//    runtime.bindTo(name, ...) -> r
//    assertions ->
//    untime.close()
//
// To make a connection to the default integration test wspr instance and
// bind to a service use:
//
//     serve('test/service', dispatcher, function(err, res) {
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
function serve(name, dispatcher, callback) {
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

    runtime.serveDispatcher(name, dispatcher, function(err, endpoint) {
      if (err) {
        return callback(err);
      }

      var res = {
        runtime: runtime,
        config: config,
        endpoint: endpoint,
        end: end
      };

      if (options.autoBind === false) {
        return callback(err, res);
      }

      runtime.bindTo(name, function(err, service) {
        if (err) {
          return callback(err);
        }

        res.service = service;

        callback(err, res);
      });
    });

    // hoisted and passed as the last argument to the callback argument.
    function end(assert) {
      if (typeof assert === 'function') {
        return runtime.close(assert);
      } else if (!! assert.end && typeof assert.end === 'function') {
        return runtime.close(assert.end);
      } else {
        var message = 'end(callback) requires a callback or assert object';
        throw new Error(message);
      }
    }
  });
}
