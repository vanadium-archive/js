var test = require('prova');
var names = require('../../src/naming/util');
var ep = '@4@tcp@127.0.0.1:22@@@@s@dev.v.io/blessing,v.io/blessing/b2@@';
var rootedEp = '/' + ep;

test('names.join(...)', function(assert) {
  assert.equal(names.join('a', 'b'), 'a/b');
  assert.equal(names.join('a/', 'b/'), 'a/b');
  assert.equal(names.join('', ''), '');
  assert.equal(names.join('', 'b'), 'b');
  assert.equal(names.join('', '/b'), '/b');
  assert.equal(names.join('a', ''), 'a');
  assert.equal(names.join('a/', ''), 'a');
  assert.equal(names.join('/a', 'b'), '/a/b');
  assert.equal(names.join('/a/b', 'c'), '/a/b/c');
  assert.equal(names.join('/a/b', 'c/d'), '/a/b/c/d');
  assert.equal(names.join('/a/b', '/c/d'), '/a/b/c/d');
  assert.equal(names.join('/a/b', '//c/d'), '/a/b/c/d');
  assert.equal(names.join('', '//a/b'), '/a/b');
  assert.equal(names.join(['a', 'b', '//c/']), 'a/b/c');
  assert.equal(names.join('a', 'b', '//c/'), 'a/b/c');
  assert.equal(names.join(), '');
  assert.equal(names.join([]), '');
  assert.equal(names.join('/a//'), '/a');
  assert.equal(names.join(rootedEp, 'a'), rootedEp + '/a');
  assert.equal(names.join(rootedEp + '/', '/a'), rootedEp + '/a');
  assert.end();
});

test('names.stripBasename(name)', function(assert) {
  assert.equal(names.stripBasename('/'), '');
  assert.equal(names.stripBasename('/a'), '');
  assert.equal(names.stripBasename('/a/'), '');
  assert.equal(names.stripBasename('/a/b'), '/a');
  assert.equal(names.stripBasename('/a/b/'), '/a');
  assert.equal(names.stripBasename(''), '');
  assert.equal(names.stripBasename('a'), '');
  assert.equal(names.stripBasename('a/'), '');
  assert.equal(names.stripBasename('a/b'), 'a');
  assert.equal(names.stripBasename('a/b/'), 'a');
  assert.equal(names.stripBasename(rootedEp), '');
  assert.equal(names.stripBasename(rootedEp + '/a'), rootedEp);
  assert.end();
});

test('names.isRooted(name)', function(assert) {
  assert.ok(names.isRooted('/'));
  assert.ok(names.isRooted('/a'));
  assert.ok(names.isRooted('/a/b'));
  assert.ok(names.isRooted(rootedEp + '/'));
  assert.notOk(names.isRooted(''));
  assert.notOk(names.isRooted('a'));
  assert.notOk(names.isRooted('b'));
  assert.ok(names.isRooted('//a'));
  assert.ok(names.isRooted('//' + rootedEp));
  assert.ok(names.isRooted(rootedEp));
  assert.end();
});

test('names.clean(name)', function(assert) {
  assert.equal(names.clean(''), '');
  assert.equal(names.clean('a'), 'a');
  assert.equal(names.clean('/b'), '/b');
  assert.equal(names.clean('a/'), 'a');
  assert.equal(names.clean('/b/'), '/b');
  assert.equal(names.clean('//foo'), '/foo');
  assert.equal(names.clean('//foo///bar/////'), '/foo/bar');
  assert.equal(names.clean(rootedEp), rootedEp);
  assert.equal(names.clean('//' + rootedEp), rootedEp);
  assert.equal(names.clean(rootedEp + '//'), rootedEp);
  assert.end();
});

test('names.basename(name)', function(assert) {
  assert.equal(names.basename('/'), '');
  assert.equal(names.basename('/a'), 'a');
  assert.equal(names.basename('/a/'), 'a');
  assert.equal(names.basename('/a/b'), 'b');
  assert.equal(names.basename('/a/b/'), 'b');
  assert.equal(names.basename(''), '');
  assert.equal(names.basename('a'), 'a');
  assert.equal(names.basename('a/'), 'a');
  assert.equal(names.basename('a/b'), 'b');
  assert.equal(names.basename('a/b/'), 'b');
  assert.end();
});

test('names.basename(name)', function(assert) {
  assert.equal(names.basename('/'), '');
  assert.equal(names.basename('/a'), 'a');
  assert.equal(names.basename('/a/'), 'a');
  assert.equal(names.basename('/a/b'), 'b');
  assert.equal(names.basename('/a/b/'), 'b');
  assert.equal(names.basename(''), '');
  assert.equal(names.basename('a'), 'a');
  assert.equal(names.basename('a/'), 'a');
  assert.equal(names.basename('a/b'), 'b');
  assert.equal(names.basename('a/b/'), 'b');
  assert.equal(names.basename(rootedEp), ep);
  assert.equal(names.basename(rootedEp + '/'), ep);
  assert.equal(names.basename(rootedEp + '/b'), 'b');
  assert.end();
});

test('names.splitAddressName(name)', function(assert) {
  var tests = [
    ['', '', ''],
    ['/', '', ''],
    ['//', '', ''],
    ['//abc@@host/foo', 'abc@@host', 'foo'],
    ['a', '', 'a'],
    ['/a', 'a', ''],
    ['/a/', 'a', ''],
    ['a/b', '', 'a/b'],
    ['/a/b', 'a', 'b'],
    ['abc@@/foo', '', 'abc@@/foo'],
    ['/abc@@host/foo', 'abc@@host', 'foo'],
    ['/abc/foo', 'abc', 'foo'],
    ['/abc/foo//x', 'abc', 'foo/x'],
    ['/abc:20/foo', 'abc:20', 'foo'],
    ['/abc//foo/bar', 'abc', 'foo/bar'],
    ['/0abc:20/foo', '0abc:20', 'foo'],
    ['/abc1.2:20/foo', 'abc1.2:20', 'foo'],
    ['/abc:xx/foo', 'abc:xx', 'foo'],
    ['/-abc/foo', '-abc', 'foo'],
    ['/a.-abc/foo', 'a.-abc', 'foo'],
    ['/[01:02::]:444', '[01:02::]:444', ''],
    ['/[01:02::]:444/foo', '[01:02::]:444', 'foo'],
    ['/12.3.4.5:444', '12.3.4.5:444', ''],
    ['/12.3.4.5:444/foo', '12.3.4.5:444', 'foo'],
    ['/12.3.4.5', '12.3.4.5', ''],
    ['/12.3.4.5/foo', '12.3.4.5', 'foo'],
    ['/12.3.4.5//foo', '12.3.4.5', 'foo'],
    ['/12.3.4.5/foo//bar', '12.3.4.5', 'foo/bar'],
    ['/user@domain.com@host:1234/foo/bar', 'user@domain.com@host:1234', 'foo/bar'], // jshint ignore:line
    ['/(dev.v.io/services/mounttabled)@host:1234/foo/bar', '(dev.v.io/services/mounttabled)@host:1234', 'foo/bar'], // jshint ignore:line
    ['/(dev.v.io/services/mounttabled)@host:1234/', '(dev.v.io/services/mounttabled)@host:1234', ''], // jshint ignore:line
    ['/(dev.v.io/services/mounttabled)@host:1234', '(dev.v.io/services/mounttabled)@host:1234', ''], // jshint ignore:line
    // the next two tests have malformed endpoint, doesn't end in a @@
    ['/@4@tcp@127.0.0.1:22@@@@s@dev.v.io/', '@4@tcp@127.0.0.1:22@@@@s@dev.v.io', ''], // jshint ignore:line
    ['/@4@tcp@127.0.0.1:22@@@@s@dev.v.io', '@4@tcp@127.0.0.1:22@@@@s@dev.v.io', ''],  // jshint ignore:line
    ['/@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled@@/foo/bar', '@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled@@', 'foo/bar'],  // jshint ignore:line
    ['/@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled,staging.v.io/services/nsroot@@/foo/bar', '@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled,staging.v.io/services/nsroot@@', 'foo/bar'],  // jshint ignore:line
    ['/@@@127.0.0.1:22@@@@/foo/bar', '@@@127.0.0.1:22@@@@', 'foo/bar'], // jshint ignore:line
    ['/@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled,staging.v.io/services/nsroot@@', '@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled,staging.v.io/services/nsroot@@', ''],  // jshint ignore:line
    ['/@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled@@/foo/bar', '@4@tcp@127.0.0.1:22@@@@s@dev.v.io/services/mounttabled@@', 'foo/bar'],  // jshint ignore:line
    [rootedEp, ep, ''],
    [rootedEp + '/b', ep, 'b'],
    [ep, '', ep],
  ];
  tests.forEach(function(t) {
    assert.deepEqual(names.splitAddressName(t[0]),
      { address: t[1], suffix: t[2] }
    );
  });

  assert.end();
});
