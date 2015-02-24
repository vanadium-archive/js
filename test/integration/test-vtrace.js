// TODO(mattr): renable test after we can turn vtrace back on.
// var test = require('prova');
// var service = require('./get-service');
// var vtrace = require('../../src/lib/vtrace');

// function findSpan(name, trace) {
//   for (var i = 0; i < trace.spans.length; i++) {
//     var span = trace.spans[i];
//     if (span.name === name) {
//       return span;
//     }
//   }
//   return null;
// }

// test('Test receiving traces with a JavaScript client', function(assert) {
//   service('test_service/cache', function(err, ctx, cache, end, runtime) {
//     if (err) {
//       end(assert, err);
//     }
//     cache.set(ctx, 'key', 'val').then(function() {
//       var span = vtrace.getSpan(ctx);
//       var record = vtrace.getStore(ctx).traceRecord(span.trace);
//       // We expect to see spans at least from:
//       // The js client.
//       assert.ok(findSpan('<jsclient>"test_service/cache".set', record));
//       // The wspr proxy.
//       assert.ok(findSpan('<wspr>"test_service/cache".Set', record));
//       // The go server.
//       assert.ok(findSpan('"cache".Set', record));
//       end(assert);
//     });
//   });
// });
