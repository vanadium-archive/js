// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('tape');

var typeUtil = require('../../src/vdl/type-util.js');
var vdl = require('../../src/vdl');

test('has any', function(t) {
  var has = [
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
    vdl.types.TYPEOBJECT,
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
    t.ok(typeUtil.hasAny(val),
      JSON.stringify(val)+' should have any');
  });
  doesntHave.forEach(function(val) {
    t.notOk(typeUtil.hasAny(val),
      JSON.stringify(val)+' shouldn\'t have any');
  });
  t.end();
});

test('has typeobject', function(t) {
  var has = [
    vdl.types.TYPEOBJECT,
    {
      kind: vdl.kind.LIST,
      elem: vdl.types.TYPEOBJECT
    }
  ];
  var doesntHave = [
    vdl.types.UINT32,
    vdl.types.BOOL,
    vdl.types.STRING,
    vdl.types.ANY,
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
    t.ok(typeUtil.hasTypeObject(val),
      JSON.stringify(val)+' should have typeobject');
  });
  doesntHave.forEach(function(val) {
    t.notOk(typeUtil.hasTypeObject(val),
      JSON.stringify(val)+' shouldn\'t have typeobject');
  });
  t.end();
});
