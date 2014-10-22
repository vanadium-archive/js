/**
 * @fileoverview Tests for the context library.
 */

var test = require('prova');
var context = require('../../src/runtime/context');

var fakeRuntime = {};
var ctx = context.Context(fakeRuntime);

test('optionalContext', function(assert) {
  function f(ctx, x, y) {
    y = context.optionalContext(arguments);
    return {
      ctx: ctx,
      x: x,
      y: y
    };
  }

  assert.deepEqual(f(ctx, 3, 6), {ctx: ctx, x: 3, y: 6});
  assert.deepEqual(f(3, 6), {ctx: ctx, x: 3, y: 6});
  assert.end();
});

test('Root Context', function(assert) {
  assert.equal(ctx.deadline(), null);
  assert.equal(ctx.done(), false);
  assert.equal(ctx.runtime(), fakeRuntime);
  assert.end();
});


var key1 = new context.ContextKey();
var key2 = new context.ContextKey();
var vctx1 = ctx.withValue(key1, 'value1');
var vctx2 = vctx1.withValue(key2, 'value2');

test('ValueContext (own value)', function(assert) {
  assert.equal(vctx1.value(key1), 'value1');
  assert.equal(vctx2.value(key2), 'value2');
  assert.end();
});

test('ValueContext (parent/child values)', function(assert) {
  assert.equal(vctx2.value(key1), 'value1');
  assert.equal(vctx1.value(key2), null);
  assert.end();
});

test('CancelContext.done', function(assert) {
  var cctx = ctx.withCancel();
  assert.plan(3);

  assert.equal(cctx.done(), false);
  cctx.waitUntilDone().catch(onerror);
  cctx.cancel();
  assert.equal(cctx.done(), true);

  function onerror(error) {
    assert.ok(error instanceof context.CancelledError);
  }
});

test('CancelContext (parent cancellation)', function(assert) {
  var cctx1 = ctx.withCancel();
  var cctx2 = cctx1.withCancel();
  assert.plan(4);

  cctx1.waitUntilDone().catch(onerror);
  cctx2.waitUntilDone().catch(onerror);
  cctx1.cancel();
  assert.equal(cctx1.done(), true);
  assert.equal(cctx2.done(), true);

  function onerror(error) {
    assert.ok(error instanceof context.CancelledError);
  }
});

test('CancelContext (ancestor cancellation)', function(assert) {
  var cctx1 = ctx.withCancel();
  cctx1.withValue(context.ContextKey(), 'value');
  var cctx2 = cctx1.withCancel();
  assert.plan(4);

  cctx1.waitUntilDone().catch(onerror);
  cctx2.waitUntilDone().catch(onerror);
  cctx1.cancel();
  assert.equal(cctx1.done(), true);
  assert.equal(cctx2.done(), true);

  function onerror(error) {
    assert.ok(error instanceof context.CancelledError);
  }
});

test('DeadlineContext', function(assert) {
  var dctx = ctx.withDeadline(Date.now() + 1);
  assert.plan(2);
  dctx.waitUntilDone().catch(onerror);

  function onerror(error) {
    assert.ok(error instanceof context.DeadlineExceededError);
    assert.equal(dctx.done(), true);
  }
});

test('DeadlineContext (parent cancellation)', function(assert) {
  var cctx = ctx.withCancel();
  var dctx = cctx.withDeadline(Date.now() + 1000 * 3600);
  assert.plan(4);

  cctx.waitUntilDone().catch(onerror);
  dctx.waitUntilDone().catch(onerror);
  cctx.cancel();
  assert.equal(cctx.done(), true);
  assert.equal(dctx.done(), true);

  function onerror(error) {
    assert.ok(error instanceof context.CancelledError);
  }
});

test('DeadlineContext (child cancellation)', function(assert) {
  var dctx = ctx.withDeadline(Date.now() + 1);
  var cctx = dctx.withCancel();

  assert.plan(2);

  cctx.waitUntilDone().catch(onerror);
  dctx.waitUntilDone().catch(onerror);

  function onerror(error) {
    assert.ok(error instanceof context.DeadlineExceededError);
  }
});
