var test = require('prova');
var vlog = require('../../src/lib/vlog').logger;
var Vlog = require('../../src/lib/vlog').Vlog;
var levels = require('../../src/lib/vlog').levels;
var methods = [
  'debug',
  'info',
  'warn',
  'error'
];

test('var vlog = require("vanadium/lib/src/vlog")', function(assert) {
  assert.ok(vlog instanceof Vlog);
  assert.end();
});

test('var log = VLog()', function(assert) {
  assert.ok(Vlog() instanceof Vlog, 'should not require "new"'); // jshint ignore:line
  assert.end();
});

test('var log = new VLog({ level: NOLOG })', function(assert) {
  var mc = new MockConsole();
  var log = new Vlog({
    level: levels.NOLOG,
    console: mc
  });

  methods.forEach(function(method) {
    log[method]('foo');
  });

  assert.equal(mc.calls('info'), 0);
  assert.equal(mc.calls('log'), 0);
  assert.equal(mc.calls('warn'), 0);
  assert.equal(mc.calls('error'), 0);

  assert.end();
});

test('var log = new VLog({ level: ERROR })', function(assert) {
  var mc = new MockConsole();
  var log = new Vlog({
    level: levels.ERROR,
    console: mc
  });

  methods.forEach(function(method) {
    log[method]('foo');
  });

  assert.equal(mc.calls('info'), 0);
  assert.equal(mc.calls('log'), 0);
  assert.equal(mc.calls('warn'), 0);
  assert.equal(mc.calls('error'), 1);

  assert.end();
});

test('var log = new VLog({ level: WARN })', function(assert) {
  var mc = new MockConsole();
  var log = new Vlog({
    level: levels.WARN,
    console: mc
  });

  methods.forEach(function(method) {
    log[method]('foo');
  });

  assert.equal(mc.calls('info'), 0);
  assert.equal(mc.calls('log'), 0);
  assert.equal(mc.calls('warn'), 1);
  assert.equal(mc.calls('error'), 1);

  assert.end();
});

test('var log = new VLog({ level: DEBUG })', function(assert) {
  var mc = new MockConsole();
  var log = new Vlog({
    level: levels.DEBUG,
    console: mc
  });

  methods.forEach(function(method) {
    log[method]('foo');
  });

  assert.equal(mc.calls('info'), 0);
  assert.equal(mc.calls('log'), 1);
  assert.equal(mc.calls('warn'), 1);
  assert.equal(mc.calls('error'), 1);

  assert.end();
});

test('var log = new VLog({ level: INFO })', function(assert) {
  var mc = new MockConsole();
  var log = new Vlog({
    level: levels.INFO,
    console: mc
  });

  methods.forEach(function(method) {
    log[method]('foo');
  });

  assert.equal(mc.calls('info'), 1);
  assert.equal(mc.calls('log'), 1);
  assert.equal(mc.calls('warn'), 1);
  assert.equal(mc.calls('error'), 1);

  assert.end();
});

test('vlog[method]() - proxies arguments to vlog.console', function(assert) {
  var mc = new MockConsole();
  var log = new Vlog({
    level: levels.INFO,
    console: mc
  });

  log.debug('foo %s', 'bar', { baz: 'qux' });

  var args = mc._calls.log[0];

  assert.equal(mc.calls('log'), 1);
  assert.equal(args[0], 'foo %s');
  assert.equal(args[1], 'bar');
  assert.deepEqual(args[2], { baz: 'qux' });
  assert.end();
});

function MockConsole() {
  this._calls = {
    info: [],
    log: [],
    warn: [],
    error: []
  };
}

MockConsole.prototype.calls = function(key) {
  return this._calls[key].length;
};

// Stub out console methods
[
  'info',
  'log',
  'warn',
  'error'
].forEach(function(m) {
  MockConsole.prototype[m] = function() {
    this._calls[m].push(arguments);
  };
});
