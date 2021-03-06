// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
var vdl = require('../../../../../../../../vdl');





var nativetest = require('./../nativetest');

module.exports = {};



// Types:
var _typeAll = new vdl.Type();
_typeAll.kind = vdl.kind.STRUCT;
_typeAll.name = "v.io/x/ref/lib/vdl/testdata/nativedep.All";
_typeAll.fields = [{name: "A", type: new nativetest.WireString()._type}, {name: "B", type: new nativetest.WireMapStringInt()._type}, {name: "C", type: new nativetest.WireTime()._type}, {name: "D", type: new nativetest.WireSamePkg()._type}, {name: "E", type: new nativetest.WireMultiImport()._type}];
_typeAll.freeze();
module.exports.All = (vdl.registry.lookupOrCreateConstructor(_typeAll));




// Consts:



// Errors:



// Services:

   
 


