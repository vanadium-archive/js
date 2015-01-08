var test = require('prova');
var ArgInspector = require('../../src/lib/arg-inspector.js');

test('var args = argInspector(fn)', function(t) {
  t.equal(typeof ArgInspector, 'function');
  t.ok(ArgInspector(noop) instanceof ArgInspector, // jshint ignore:line
    'should not require "new"');
  t.end();
});

test('args.names', function(t) {
  var args = new ArgInspector(fn);

  t.deepEqual(args.names, [
    'ctx',
    'a',
    '$stream',
    'b',
    'c',
    'd',
    'cb'
  ]);
  t.end();

  function fn(ctx, a, $stream, b, c, d, cb) {}
});

test('args.filteredNames - ctx/cb', function(t) {
  var args = new ArgInspector(fn);

  t.deepEqual(args.filteredNames, [
    'a',
    'b',
    'c',
    'd'
  ]);
  t.end();

  function fn(ctx, a, $stream, b, c, d, cb) {}
});

test('args.filteredNames - context/callback', function(t) {
  var args = new ArgInspector(fn);

  t.deepEqual(args.filteredNames, [
    'a',
    'b',
    'c',
    'd'
  ]);
  t.end();

  function fn(context, a, $stream, b, c, d, callback) {}
});

test('args.position(name)', function(t) {
  var args = new ArgInspector(fn);

  t.equal(args.position('ctx'), 0);
  t.equal(args.position('foo'), 1);
  t.equal(args.position('bar'), 2);
  t.equal(args.position('$stream'), 3);
  t.equal(args.position('baz'), 4);
  t.equal(args.position('cb'), 5);
  t.equal(args.position('qux'), -1);
  t.end();

  function fn(ctx, foo, bar, $stream, baz, cb) {}
});

test('args.contains(name)', function(t) {
  var args = new ArgInspector(fn);

  t.ok(args.contains('ctx'), 'should contain context');
  t.ok(args.contains('a'), 'should contain a');
  t.ok(args.contains('b'), 'should contain b');
  t.notOk(args.contains('cb'), 'should contain cb');
  t.end();

  function fn(ctx, a, b) {}
});

test('args.hasContext()', function(t) {
  t.equal((new ArgInspector(withCtx)).hasContext(), true);
  t.equal((new ArgInspector(withContext)).hasContext(), true);
  t.equal((new ArgInspector(noContext)).hasContext(), false);
  t.end();

  function withCtx(ctx) {}

  function withContext(context) {}

  function noContext() {}
});

function noop() {}
