/**
 * @fileoverview Tests for name utilities.
 */
'use strict';

var names = require('../../../../src/naming/names');

describe('Splitting address and name', function() {
  function SplitTest(input, address, name) {
    this.message = 'On ' + input +
      ' should return ' + address + ' and ' + name;
    this.run = function run(){
      var result = names.splitAddressName(input);
      expect(result).to.eql({address: address, name: name});
    };
  }

  var tests = [
    new SplitTest('', '', ''),
    new SplitTest('/', '', ''),
    new SplitTest('//', '', '//'),
    new SplitTest('/a/', 'a', ''),
    new SplitTest('//abc@@/foo', '', '//abc@@/foo'),
    new SplitTest('a', '', 'a'),
    new SplitTest('a/b', '', 'a/b'),
    new SplitTest('/a/b', 'a', 'b'),
    new SplitTest('abc@@/foo', '', 'abc@@/foo'),
    new SplitTest('/abc@@/foo', 'abc@@', 'foo'),
    new SplitTest('/abc/foo', 'abc', 'foo'),
    new SplitTest('/abc/foo//x', 'abc', 'foo//x'),
    new SplitTest('/abc:20/foo', 'abc:20', 'foo'),
    new SplitTest('/abc//foo/bar', 'abc', '//foo/bar'),
    new SplitTest('/0abc:20/foo', '0abc:20', 'foo'),
    new SplitTest('/abc1.2:20/foo', 'abc1.2:20', 'foo'),
    new SplitTest('/abc:xx/foo', 'abc:xx', 'foo'),
    new SplitTest('/-abc/foo', '-abc', 'foo'),
    new SplitTest('/a.-abc/foo', 'a.-abc', 'foo'),
    new SplitTest('/[01:02::]:444', '[01:02::]:444', ''),
    new SplitTest('/[01:02::]:444/foo', '[01:02::]:444', 'foo'),
    new SplitTest('/12.3.4.5:444', '12.3.4.5:444', ''),
    new SplitTest('/12.3.4.5:444/foo', '12.3.4.5:444', 'foo'),
    new SplitTest('/12.3.4.5', '12.3.4.5', ''),
    new SplitTest('/12.3.4.5/foo', '12.3.4.5', 'foo'),
    new SplitTest('/12.3.4.5//foo', '12.3.4.5', '//foo'),
    new SplitTest('/12.3.4.5/foo//bar', '12.3.4.5', 'foo//bar')
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Joining address and name', function() {
  function JoinTest(address, name, output) {
    this.message = 'On ' + address + ' and ' + name +
      ' should return ' + output;
    this.run = function run(){
      var result = names.joinAddressName(address, name);
      expect(result).to.equal(output);
    };
  }

  var tests = [
		new JoinTest('', '', ''),
		new JoinTest('', 'a', 'a'),
		new JoinTest('', '/a', '/a'),
		new JoinTest('', '//a', '//a'),
		new JoinTest('', '///a', '///a'),
		new JoinTest('/', '', ''),
		new JoinTest('//', '', ''),
		new JoinTest('/a', '', '/a'),
		new JoinTest('//a', '', '/a'),
		new JoinTest('aaa', '', '/aaa'),
		new JoinTest('/aaa', 'aa', '/aaa/aa'),
		new JoinTest('ab', '/cd', '/ab/cd'),
		new JoinTest('/ab', '/cd', '/ab/cd'),
		new JoinTest('ab', '//cd', '/ab//cd')
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Joining names', function() {
  function JoinTest(prefix, suffix, output) {
    this.message = 'On ' + prefix + ' and ' + suffix +
      ' should return ' + output;
    this.run = function run(){
      var result = names.join(prefix, suffix);
      expect(result).to.equal(output);
    };
  }

  var tests = [
		new JoinTest('a', 'b', 'a/b'),
		new JoinTest('a/', 'b/', 'a/b/'),
		new JoinTest('', 'b', 'b'),
		new JoinTest('a', '', 'a'),
		new JoinTest('a/', '', 'a'),
		new JoinTest('/a', 'b', '/a/b'),
		new JoinTest('/a/b', 'c', '/a/b/c'),
		new JoinTest('/a/b', 'c/d', '/a/b/c/d'),
		new JoinTest('/a/b', '/c/d', '/a/b/c/d'),
		new JoinTest('/a/b', '//c/d', '/a/b//c/d'),
		new JoinTest('', '//a/b', '//a/b')
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Splitting and rejoining', function() {
  function SplitJoinTest(input, address, name) {
    this.message = input + ' should produce ' + address +
      ' and ' + name + ' then rejoin to ' + input;
    this.run = function run(){
      var result = names.splitAddressName(input);
      expect(result).to.eql({address: address, name: name});
      result = names.joinAddressName(result.address, result.name);
      expect(result).to.equal(input);
    };
  }

  var tests = [
		new SplitJoinTest('/a/b', 'a', 'b'),
		new SplitJoinTest('/a//b', 'a', '//b'),
		new SplitJoinTest('/a:10//b/c', 'a:10', '//b/c'),
		new SplitJoinTest('/a:10/b//c', 'a:10', 'b//c')
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Testing terminal', function() {
  function TerminalTest(input, output) {
    this.message = 'On ' + input + ' should return ' + output;
    this.run = function run(){
      var result = names.terminal(input);
      expect(result).to.equal(output);
    };
  }

  var ep = '/@2@tcp@h:0@@@@@';
  var tests = [
    new TerminalTest('', true),
		new TerminalTest('/', true),
		new TerminalTest('//', true),
		new TerminalTest('//a/b', true),
		new TerminalTest(ep + '', true),
		new TerminalTest(ep + '//', true),
		new TerminalTest(ep + '//a', true),
		new TerminalTest(ep + '//a/b', true),
		new TerminalTest('/a/b', false),
		new TerminalTest('a/b', false),
		new TerminalTest('a//b', false),
		new TerminalTest(ep + '/a', false),
		new TerminalTest(ep + '/a//b', false)
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Making a name terminal', function() {
  function MakeTerminalTest(input, output) {
    this.message = 'Should transform ' + input +
      ' into ' + output;
    this.run = function run(){
      var result = names.makeTerminal(input);
      expect(result).to.equal(output);
    };
  }

  var ep = '/@2@tcp@h:0@@@@@';
  var tests = [
		// relative names
		new MakeTerminalTest('', ''),
		new MakeTerminalTest('a', '//a'),
		new MakeTerminalTest('a/b', '//a/b'),
		// rooted names
		new MakeTerminalTest(ep + '', ep + ''),
		new MakeTerminalTest(ep + '/', ep + ''),
		new MakeTerminalTest(ep + '//', ep + '//'),
		new MakeTerminalTest(ep + '/a', ep + '//a'),
		new MakeTerminalTest(ep + '/a/c', ep + '//a/c'),
		new MakeTerminalTest(ep + '/a//c', ep + '//a//c'),
		new MakeTerminalTest(ep + '/a/b//c', ep + '//a/b//c'),
		// corner cases
		new MakeTerminalTest('//', '//'),
		new MakeTerminalTest('///', '//'),
		new MakeTerminalTest('///' + ep + '/', '/' + ep + '/')
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Making a name terminal at an index', function() {
  function MakeTerminalIndexTest(input, index, output) {
    this.message = 'Should transform ' + input +
      ' into ' + output + ' given index ' + index;
    this.run = function run(){
      var result = names.makeTerminalAtIndex(input, index);
      expect(result).to.equal(output);
    };
  }

  var ep = '/@2@tcp@h:0@@@@@';
  var tests = [
		new MakeTerminalIndexTest('a/b/c', 1, 'a//b/c'),
		new MakeTerminalIndexTest('a/b/c', -1, 'a/b//c'),
		new MakeTerminalIndexTest('a/b/c/', 3, 'a/b/c//'),
		new MakeTerminalIndexTest('a////b/c/', 3, 'a////b/c//'),
		new MakeTerminalIndexTest('a/b///c', -1, 'a/b//c'),
		new MakeTerminalIndexTest('a/b///c/', -1, 'a/b///c//'),
		new MakeTerminalIndexTest('a/b///c', 1, 'a//b///c'),
		new MakeTerminalIndexTest('', 0, ''),
		new MakeTerminalIndexTest('//a//b', 0, '//a//b'),
		new MakeTerminalIndexTest('', -1, ''),
		new MakeTerminalIndexTest('', 2, ''),
		new MakeTerminalIndexTest('', 1, ''),
		new MakeTerminalIndexTest('', -2, ''),
		new MakeTerminalIndexTest('//', 0, '//'),
		new MakeTerminalIndexTest('//', -1, '//'),
		new MakeTerminalIndexTest('//', 2, '//'),
		new MakeTerminalIndexTest('//', 1, '//'),
		new MakeTerminalIndexTest('//', -2, '//'),
		new MakeTerminalIndexTest('a', 0, '//a'),
		new MakeTerminalIndexTest('a/b', 1, 'a//b'),
		new MakeTerminalIndexTest('a/b', 2, 'a/b//'),
		new MakeTerminalIndexTest('a/b', 3, 'a/b//'),
		new MakeTerminalIndexTest('a/b', -1, 'a//b'),
		new MakeTerminalIndexTest('a/b', -2, '//a/b'),
		new MakeTerminalIndexTest('a/b', -3, '//a/b'),
		new MakeTerminalIndexTest('a/b//', -3, '//a/b//'),
		new MakeTerminalIndexTest('//a/b//', -3, '//a/b//'),
		new MakeTerminalIndexTest('a/b/c/d', -2, 'a/b//c/d'),
		new MakeTerminalIndexTest('a/b/c/d', 1, 'a//b/c/d'),
		new MakeTerminalIndexTest('a/b/c/d', 2, 'a/b//c/d'),
		new MakeTerminalIndexTest('a/b/c/d', 3, 'a/b/c//d'),
		new MakeTerminalIndexTest('a/b/c/d/', 4, 'a/b/c/d//'),
		new MakeTerminalIndexTest('aa/bb', 1, 'aa//bb'),
		new MakeTerminalIndexTest('aa/bb', 2, 'aa/bb//'),
		new MakeTerminalIndexTest('aa/bb', 3, 'aa/bb//'),
		new MakeTerminalIndexTest('aa/bb', -1, 'aa//bb'),
		new MakeTerminalIndexTest('aa/bb', -2, '//aa/bb'),
		new MakeTerminalIndexTest('aa/bb', -3, '//aa/bb'),
		new MakeTerminalIndexTest('aa/bb//', -3, '//aa/bb//'),
		new MakeTerminalIndexTest('//aa/bb//', -3, '//aa/bb//'),
		new MakeTerminalIndexTest('aa/bb/cc/dd', -2, 'aa/bb//cc/dd'),
		new MakeTerminalIndexTest('aa/bb/cc/dd', 1, 'aa//bb/cc/dd'),
		new MakeTerminalIndexTest('aa/bb/cc/dd', 2, 'aa/bb//cc/dd'),
		new MakeTerminalIndexTest('aa/bb/cc/dd', 3, 'aa/bb/cc//dd'),
		new MakeTerminalIndexTest('aa/bb/cc/dd/', 4, 'aa/bb/cc/dd//'),
		new MakeTerminalIndexTest(ep + '//', 0, ep + '//'),
		new MakeTerminalIndexTest(ep + '//', -1, ep + '//'),
		new MakeTerminalIndexTest(ep + '//', 1, ep + '//'),
		new MakeTerminalIndexTest(ep + '/a', 0, ep + '//a'),
		new MakeTerminalIndexTest(ep + '/a/b', 0, ep + '//a/b'),
		new MakeTerminalIndexTest(ep + '/a/b', 1, ep + '/a//b'),
		new MakeTerminalIndexTest(ep + '/a/b', 2, ep + '/a/b//'),
		new MakeTerminalIndexTest(ep + '/a/b', 100, ep + '/a/b//'),
		new MakeTerminalIndexTest(ep + '/a/b/c', 0, ep + '//a/b/c'),
		new MakeTerminalIndexTest(ep + '/a/b/c', 1, ep + '/a//b/c'),
		new MakeTerminalIndexTest(ep + '/a/b/c', 2, ep + '/a/b//c'),
		new MakeTerminalIndexTest(ep + '/a/b/c', 3, ep + '/a/b/c//'),
		new MakeTerminalIndexTest(ep + '/a/b/c', -1, ep + '/a/b//c'),
		new MakeTerminalIndexTest(ep + '/a/b/c', -2, ep + '/a//b/c'),
		new MakeTerminalIndexTest(ep + '/a/b/c', -3, ep + '//a/b/c'),
		new MakeTerminalIndexTest(ep + '/a/b/c', -4, ep + '//a/b/c'),
		new MakeTerminalIndexTest(ep + '//a//b//c/', -1, ep + '//a//b//c//'),
		new MakeTerminalIndexTest(ep + '//a//b//c//', -1, ep + '//a//b//c//'),
		new MakeTerminalIndexTest(ep + '//a//b//c//', 1, ep + '//a//b//c//'),
		new MakeTerminalIndexTest(ep + '//a//b//c//', 2, ep + '//a//b//c//')
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Rooted', function() {
  function RootedTest(input, output) {
    this.message = 'Should return ' + output +
      ' for ' + input;
    this.run = function run(){
      var result = names.rooted(input);
      expect(result).to.equal(output);
    };
  }

  var ep = '/@2@tcp@h:0@@@@@';
  var tests = [
		new RootedTest('/', true),
		new RootedTest('/a', true),
		new RootedTest('/a/b', true),
		new RootedTest(ep + '/', true),

		new RootedTest('', false),
		new RootedTest('//a', false),
		new RootedTest('//b', false),
		new RootedTest('//' + ep, false),
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});

describe('Making a name resolvable', function() {
  function MakeResolvableTest(input, output) {
    this.message = 'Should return ' + output +
      ' for ' + input;
    this.run = function run(){
      var result = names.makeResolvable(input);
      expect(result).to.equal(output);
    };
  }

  var ep = '/@2@tcp@h:0@@@@@';
  var tests = [
		new MakeResolvableTest('', ''),
		new MakeResolvableTest('/', '/'),
		new MakeResolvableTest('//', ''),
		new MakeResolvableTest('a', 'a'),
		new MakeResolvableTest('a/b', 'a/b'),
		new MakeResolvableTest('//a/b', 'a/b'),
		new MakeResolvableTest('///a/b', 'a/b'),
		new MakeResolvableTest('a//b', 'a/b'),
		new MakeResolvableTest('a//b//', 'a/b//'),
		new MakeResolvableTest('//a//b//', 'a//b//'),
		new MakeResolvableTest('//a//b///', 'a//b///'),
		new MakeResolvableTest(ep + '//a', ep + '/a'),
		new MakeResolvableTest(ep + '//a/b', ep + '/a/b'),
		new MakeResolvableTest(ep + '//a///b', ep + '/a///b'),
		new MakeResolvableTest(ep + '///a//b', ep + '/a//b'),
		new MakeResolvableTest(ep + '///a//b//', ep + '/a//b//')
  ];
  for (var i = 0; i < tests.length; i++) {
    var test = tests[i];
    it(test.message, test.run);
  }
});
