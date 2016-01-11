// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');

var typeUtil = require('../../src/vdl/type-util.js');
var vdl = require('../../src/vdl');

test('has any or type object', function(t) {
  var has = [
    vdl.types.TYPEOBJECT,
    vdl.types.ANY,
    {
      kind: vdl.kind.LIST,
      elem: vdl.types.ANY
    }
  ];
  var doesntHave = [
    vdl.types.UINT32,
    vdl.types.BOOL,
    vdl.types.STRING,
    {
      kind: vdl.kind.STRUCT,
      name: 'aname',
      fields: [
        {
          name: 'field1',
          type: {
            kind: vdl.kind.LIST,
            elem: vdl.types.INT32
          }
        }
      ]
    }
  ];

  has.forEach(function(val) {
    t.ok(typeUtil.hasAnyOrTypeObject(val),
      JSON.stringify(val)+' should have any or type object');
  });
  doesntHave.forEach(function(val) {
    t.notOk(typeUtil.hasAnyOrTypeObject(val),
      JSON.stringify(val)+' shouldn\'t have any or type object');
  });
  t.end();
});
