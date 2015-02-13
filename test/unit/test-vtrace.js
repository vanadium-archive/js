/**
 * @fileoverview Tests for the vtrace library.
 */

var test = require('prova');
var context = require('../../src/runtime/context');
var vtrace = require('../../src/lib/vtrace');

test('Basic Span', function(assert) {
  var ctx = context.Context();
  ctx = vtrace.withNewStore(ctx);
  ctx = vtrace.withNewTrace(ctx);
  ctx = vtrace.withNewSpan(ctx, 'span1');

  var span = vtrace.getSpan(ctx);
  span.annotate('annotation in span1');
  span.finish();

  var store = vtrace.getStore(ctx);
  var records = store.traceRecords();

  assert.equal(records.length, 1);
  var trace = records[0];

  assert.equal(trace.spans.length, 2);
  assert.equal(trace.spans[0].name, '');
  assert.equal(trace.spans[1].name, 'span1');

  assert.end();
});
