/**
 * @fileoverview Tests for name utilities.
 */
'use strict';

var names = require('../../../../src/namespace/util');

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
		new JoinTest('', 'b', '/b'),
    new JoinTest('', '/b', '/b'),
		new JoinTest('a', '', 'a/'),
		new JoinTest('a/', '', 'a/'),
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

  it('should handle array input', function() {
    expect(names.join(['a', 'b', '//c/'])).to.equal('a/b//c/');
  });

  it('should accept more than 2 args', function() {
    expect(names.join('a', 'b', '//c/')).to.equal('a/b//c/');
  });

  it('should give empty string on zero args', function() {
    expect(names.join()).to.equal('');
  });

  it('should give empty string on empty array', function() {
    expect(names.join([])).to.equal('');
  });

  it('should handle 1 arg', function() {
    expect(names.join('/a//')).to.equal('/a//');
  });
});

describe('Testing terminal', function() {
  function TerminalTest(input, output) {
    this.message = 'On ' + input + ' should return ' + output;
    this.run = function run(){
      var result = names._isTerminal(input);
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
      var result = names._convertToTerminalName(input);
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

describe('Rooted', function() {
  function RootedTest(input, output) {
    this.message = 'Should return ' + output +
      ' for ' + input;
    this.run = function run(){
      var result = names._isRooted(input);
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
