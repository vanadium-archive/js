// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var formatError = require('../../src/verror/format');

function expectFormatParams(t, format, expected) {
  var args = Array.prototype.slice.call(arguments).splice(3);
  var res = formatError(format, args);
  t.equals(res, expected);
}

test('go formatError testcases', function(t) {
  expectFormatParams(t, '', '', '1st');
	expectFormatParams(t, '{_}', '');
	expectFormatParams(t, '{0} {1} {2} {3} {4} {5}', '? ? ? ? ? ?');
	expectFormatParams(t, '{ foo }{2}', '{ foo }?');
	expectFormatParams(t, '{3}: foo {2} bar {_} ({3})',
                     '3rd: foo 2nd bar 1st 4th (3rd)',
                     '1st', '2nd', '3rd', '4th');
	expectFormatParams(t, '{0}: foo {4} {5}', '?: foo 4th ?',
                     '1st', '2nd', '3rd', '4th');
	expectFormatParams(t, '{_} foo {_}{-1}', ' foo 1st 2nd 3rd 4th{-1}',
                     '1st', '2nd', '3rd', '4th');
  expectFormatParams(t, '{ foo }{2}', '{ foo }2nd', '1st',
                     '2nd', '3rd', '4th');

	// Test the formatting of colon-formats.
	expectFormatParams(t, '{:_}', '');
	expectFormatParams(t, '{_:}', '');
	expectFormatParams(t, '{:_:}', '');

	expectFormatParams(t, '{:_}', ': 1st 2nd', '1st', '2nd');
	expectFormatParams(t, '{_:}', '1st 2nd:', '1st', '2nd');
	expectFormatParams(t, '{:_:}', ': 1st 2nd:', '1st', '2nd');

	expectFormatParams(t, '{:_}', '', '');
	expectFormatParams(t, '{_:}', '', '');
	expectFormatParams(t, '{:_:}', '', '');

	expectFormatParams(t, '{:1}', ': 1st', '1st');
	expectFormatParams(t, '{1:}', '1st:', '1st');
	expectFormatParams(t, '{:1:}', ': 1st:', '1st');

	expectFormatParams(t, '{:1}', '', '');
	expectFormatParams(t, '{1:}', '','');
	expectFormatParams(t, '{:1:}', '', '');

	expectFormatParams(t, '{0}{:1} {2:} {3}{:4:} {5}', '?: ? ?: ?: ?: ?');

	expectFormatParams(t, '{: foo }{2}', '{: foo }?');
	expectFormatParams(t, '{ foo :}{2}', '{ foo :}?');
	expectFormatParams(t, '{: foo :}{2}', '{: foo :}?');

	expectFormatParams(t, '{3:} foo {2} bar{:_} ({3})',
                     '3rd: foo 2nd bar: 1st 4th (3rd)',
                     '1st', '2nd', '3rd', '4th');

	expectFormatParams(t, '{0:} foo{:4} {5}', '?: foo: 4th ?',
                     '1st', '2nd', '3rd', '4th');

	expectFormatParams(t, '{_:} foo{:_}{-1}', ' foo: 1st 2nd 3rd 4th{-1}',
                     '1st', '2nd', '3rd', '4th');

	expectFormatParams(t, '{4:}{ foo }{:2}', '{ foo }: 2nd',
                     '1st', '2nd', '3rd', '');

	expectFormatParams(t, '{1} foo {2:} bar{:3} wombat{:4:} numbat',
    '1st foo 2nd: bar: 3rd wombat: 4th: numbat',
		'1st', '2nd', '3rd', '4th');

	expectFormatParams(t, '{1} foo {2:} bar{:3} wombat{:4:} numbat',
    ' foo  bar wombat numbat',
		'', '', '', '');
    t.end();
});
