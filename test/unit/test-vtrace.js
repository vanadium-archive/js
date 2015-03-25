// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview Tests for the vtrace library.
 */

var test = require('prova');
var context = require('../../src/runtime/context');
var vtrace = require('../../src/vtrace');
var vdl = require('../../src/gen-vdl/v.io/v23/vtrace');
var uniqueid = require('../../src/lib/uniqueid');
var uidvdl = require('../../src/gen-vdl/v.io/v23/uniqueid');
var typeutil = require('../../src/vdl/type-util');
// We need the native-types registered for vtrace to work.
require('../../src/vom/native-types');

// Normally uniqueid generates random ids.  That makes testing hard.
// We inject this function to cause it to generate predictable ids.
var nextid;
function consecutive() {
  var out = new uidvdl.Id();
  var val = typeutil.unwrap(out);
  val[15] = nextid;
  nextid = (nextid + 1) % 256;
  return out;
}

// Normally vtrace marks many events with the current time.  That
// makes testing hard.  We inject this function to make time advance
// at a predictable rate (every time you call it, the time is 1s later).
var nextSeconds;
function fakeNow() {
  var ret = new Date(nextSeconds * 1000);
  nextSeconds += 1;
  return ret;
}

// This function is called for each test to ensure that tests are
// independent of each other.
function reset() {
  nextid = 1;
  nextSeconds = 1;
}

function setup(assert, f) {
  reset();
  var orig = uniqueid.random;
  uniqueid.random = consecutive;
  assert.on('end', function() {
    uniqueid.random = orig;    
  });
  var ctx = context.Context();
  ctx = vtrace.withNewStore(ctx);
  var store = vtrace.getStore(ctx);
  store._now = fakeNow;
  store.setCollectRegexp('.*');
  ctx = vtrace.withNewTrace(ctx);
  f(ctx, vtrace.getSpan(ctx), store);
}

test('Basic Span', function(assert) {
  setup(assert, function(ctx, span, store) {
    ctx = vtrace.withNewSpan(ctx, 'span1');
    span = vtrace.getSpan(ctx);
    span.annotate('annotation in span1');
    span.finish();
    var records = store.traceRecords();
    assert.equal(records.length, 1);
    var trace = records[0];
    assert.equal(trace.spans.length, 2);
    assert.equal(trace.spans[0].name, '');
    span = trace.spans[1];
    assert.equal(span.name, 'span1');
    assert.equal(span.annotations.length, 1);
    assert.equal(span.annotations[0].message, 'annotation in span1');
    assert.end();
  });
});

test('formatTraces', function(assert) {
  setup(assert, function(ctx, span, store) {
    span.annotate('a1');
    span.annotate('a2');
    ctx = vtrace.withNewSpan(ctx, 'span2');
    var span2 = vtrace.getSpan(ctx);
    span2.annotate('a3');
    span2.annotate('a4');
    span2.finish();
    var got = vtrace.formatTraces(store.traceRecords());
    var expected = 'Vtrace traces:\n' +
      'Trace - 00000000000000000000000000000002' +
      ' (1970-01-01T00:00:01.000Z, ??)\n' +
      '    @1s a1\n' +
      '    @2s a2\n' +
      '    Span - span2 [id: 00000003 parent: 00000001] (3s, 6s)\n' +
      '        @4s a3\n' +
      '        @5s a4\n';
    assert.equal(got, expected);
    assert.end();
  });
});

test('formatTraces - multiple', function(assert) {
  setup(assert, function(ctx, span, store) {
    var ctx2 = vtrace.withNewTrace(ctx);

    span.annotate('a1');
    span.annotate('a2');
    ctx = vtrace.withNewSpan(ctx, 'span2');
    var span2 = vtrace.getSpan(ctx);
    span2.annotate('a3');
    span2.annotate('a4');
    span2.finish();

    var span3 = vtrace.getSpan(ctx2);
    span3.annotate('a5');
    span3.annotate('a6');
    span3.finish();
    ctx2 = vtrace.withNewSpan(ctx2, 'span4');
    var span4 = vtrace.getSpan(ctx2);
    span4.annotate('a7');
    span4.annotate('a8');
    span4.finish();

    var got = vtrace.formatTraces(store.traceRecords());
    var expected = 'Vtrace traces:\n' +
      'Trace - 00000000000000000000000000000002' +
      ' (1970-01-01T00:00:01.000Z, ??)\n' +
      '    @2s a1\n' +
      '    @3s a2\n' +
      '    Span - span2 [id: 00000005 parent: 00000001] (4s, 7s)\n' +
      '        @5s a3\n' +
      '        @6s a4\n' +
      'Trace - 00000000000000000000000000000004 '+
      '(1970-01-01T00:00:02.000Z, 1970-01-01T00:00:11.000Z)\n' +
      '    @7s a5\n' +
      '    @8s a6\n' +
      '    Span - span4 [id: 00000006 parent: 00000003] (10s, 13s)\n' +
      '        @11s a7\n' +
      '        @12s a8\n';
    assert.equal(got, expected);
    assert.end();
  });
});

test('formatTraces - missing data', function(assert) {
  setup(assert, function(ctx, span, store) {
    span.annotate('a1');
    span.annotate('a2');
    var missingId = consecutive();
    ctx = vtrace.withContinuedTrace(ctx, 'span2', vdl.Request({
      spanId: missingId,
      traceId: span.trace,
      flags: vdl.CollectInMemory
    }));
    var span2 = vtrace.getSpan(ctx);
    span2.annotate('a3');
    span2.annotate('a4');
    span2.finish();
    span.finish();
    var got = vtrace.formatTraces(store.traceRecords());
    var expected = 'Vtrace traces:\n' +
      'Trace - 00000000000000000000000000000002 ' +
      '(1970-01-01T00:00:01.000Z, 1970-01-01T00:00:08.000Z)\n' +
      '    @1s a1\n' +
      '    @2s a2\n' +
      '    Span - Missing Data [id: 00000000 parent: 00000000] (??, ??)\n' +
      '        Span - span2 [id: 00000004 parent: 00000003] (3s, 6s)\n' +
      '            @4s a3\n' +
      '            @5s a4\n';
    assert.equal(got, expected);
    assert.end();
  });
});
