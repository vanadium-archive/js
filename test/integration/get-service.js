var veyron = require('../../');
var config = {
  wspr: 'http://' + process.env.WSPR_ADDR
};

module.exports = service;

// DRYs up test code by wrapping the default success case for:
//
//    veyron.init() -> runtime.bindTo() -> assertions -> runtime.close()
//
// To make a connection to the default integration test wspr instance and
// bind to a service use:
//
//     service('test_service/cache', function(err, cache, end) {
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
  veyron.init(config, function(err, runtime) {
    if (err) {
      return callback(err);
    }

    runtime.bindTo(name, function(err, service) {
      callback(err, service, end, runtime);
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
