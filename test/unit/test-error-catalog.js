// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');
var Catalog = require('../../src/verror/catalog');

test('set and lookup', function(assert) {
  var catalog = new Catalog();
  var fmt = 'expected format';
  assert.equals(catalog.lookup('en', 'bar'), 'bar{:_}');
  assert.equals(catalog.lookup('en-US', 'bar'), 'bar{:_}');
  assert.equals(catalog.lookup('en', 'foo'), 'foo{:_}');
  assert.equals(catalog.lookup('en-US', 'foo'), 'foo{:_}');
  catalog.set('en-US', 'bar', fmt);
  catalog.setWithBase('en-US', 'foo', fmt);

  assert.equals(catalog.lookup('en', 'bar'), 'bar{:_}');
  assert.equals(catalog.lookup('en-US', 'bar'), fmt);
  assert.equals(catalog.lookup('en', 'foo'), fmt);
  assert.equals(catalog.lookup('en-US', 'foo'), fmt);

  // Make sure that setWithBase does not overwrite an existing base entry.
  catalog.setWithBase('en-US', 'foo', 'other format');
  assert.equals(catalog.lookup('en', 'bar'), 'bar{:_}');
  assert.equals(catalog.lookup('en-US', 'bar'), fmt);
  assert.equals(catalog.lookup('en', 'foo'), fmt);
  assert.equals(catalog.lookup('en-US', 'foo'), 'other format');
  assert.end();
});

var catFile = '# In what follows we use the "languages" "fwd" and "back".\n' +
'fwd foo "{1} foo to {2}"\n' +
'# Next line has a missing trailing double quote, so will be ignored.\n' +
'back   foo   "{2} from foo {1}\n' +
'\n' +
'# Comment "quote"\n' +
'\n' +
'# The following two lines are ignored, since each has missing tokens.\n' +
'one\n' +
'one two\n' +
'\n' +
'fwd 	bar "{1} bar to {2}"\n' +
'back bar "{2} from bar {1}" extraneous word\n' +
'\n' +
'back funny.msg.id "{2} from funny msg id {1}"\n' +
'odd.lang.id funny.msg.id "odd and\\b \\"funny\\""\n';

test('merge', function(assert) {
  var catalog = new Catalog();
  catalog.merge(catFile);
  assert.equal(catalog.lookup('fwd', 'foo'), '{1} foo to {2}');
  assert.equal(catalog.lookup('back', 'foo'), 'foo{:_}');
  assert.equal(catalog.lookup('fwd', 'bar'), '{1} bar to {2}');
  assert.equal(catalog.lookup('back', 'bar'), '{2} from bar {1}');
  assert.equal(catalog.lookup('back', 'funny.msg.id'),
               '{2} from funny msg id {1}');
  assert.equal(catalog.lookup('odd.lang.id', 'funny.msg.id'),
               'odd and\b \"funny\"');
  assert.end();
});
