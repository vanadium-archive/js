var test = require('prova');
var names = require('../../src/namespace/util');
var ep = '/@2@tcp@h:0@@@@@';

test('names.join(...)', function(assert) {
  assert.equal(names.join('a', 'b'), 'a/b');
  assert.equal(names.join('a/', 'b/'), 'a/b/');
  assert.equal(names.join('', 'b'), '/b');
  assert.equal(names.join('', '/b'), '/b');
  assert.equal(names.join('a', ''), 'a/');
  assert.equal(names.join('a/', ''), 'a/');
  assert.equal(names.join('/a', 'b'), '/a/b');
  assert.equal(names.join('/a/b', 'c'), '/a/b/c');
  assert.equal(names.join('/a/b', 'c/d'), '/a/b/c/d');
  assert.equal(names.join('/a/b', '/c/d'), '/a/b/c/d');
  assert.equal(names.join('/a/b', '//c/d'), '/a/b//c/d');
  assert.equal(names.join('', '//a/b'), '//a/b');
  assert.equal(names.join(['a', 'b', '//c/']), 'a/b//c/');
  assert.equal(names.join('a', 'b', '//c/'), 'a/b//c/');
  assert.equal(names.join(), '');
  assert.equal(names.join([]), '');
  assert.equal(names.join('/a//'), '/a//');
  assert.end();
});

test('names.isRooted(name)', function(assert) {
  assert.ok(names.isRooted('/'));
  assert.ok(names.isRooted('/a'));
  assert.ok(names.isRooted('/a/b'));
  assert.ok(names.isRooted(ep + '/'));
  assert.notOk(names.isRooted(''));
  assert.notOk(names.isRooted('//a'));
  assert.notOk(names.isRooted('//b'));
  assert.notOk(names.isRooted('//' + ep));
  assert.end();
});

test('names.stripBasename(name)', function(assert) {
  assert.equal(names.stripBasename('/'), '/');
  assert.equal(names.stripBasename('/a'), '/');
  assert.equal(names.stripBasename('/a/'), '/a/');
  assert.equal(names.stripBasename('/a/b'), '/a/');
  assert.equal(names.stripBasename('/a/b/'), '/a/b/');
  assert.equal(names.stripBasename('a'), '');
  assert.equal(names.stripBasename('a/'), 'a/');
  assert.equal(names.stripBasename('a/b'), 'a/');
  assert.equal(names.stripBasename('a/b/'), 'a/b/');
  assert.end();
});

test('names.basename(name)', function(assert) {
  assert.equal(names.basename('/'), '');
  assert.equal(names.basename('/a'), 'a');
  assert.equal(names.basename('/a/'), '');
  assert.equal(names.basename('/a/b'), 'b');
  assert.equal(names.basename('/a/b/'), '');
  assert.equal(names.basename('a'), 'a');
  assert.equal(names.basename('a/'), '');
  assert.equal(names.basename('a/b'), 'b');
  assert.equal(names.basename('a/b/'), '');
  assert.end();
});
