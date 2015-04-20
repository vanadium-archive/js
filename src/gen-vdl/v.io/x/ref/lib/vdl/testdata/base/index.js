// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
var vdl = require('../../../../../../../../vdl');
var makeError = require('../../../../../../../../verror/make-errors');
var actions = require('../../../../../../../../verror/actions');
var canonicalize = require('../../../../../../../../vdl/canonicalize');






module.exports = {};



// Types:
var _type1 = new vdl.Type();
var _type10 = new vdl.Type();
var _type11 = new vdl.Type();
var _type12 = new vdl.Type();
var _type13 = new vdl.Type();
var _type14 = new vdl.Type();
var _type15 = new vdl.Type();
var _type16 = new vdl.Type();
var _type17 = new vdl.Type();
var _type2 = new vdl.Type();
var _type3 = new vdl.Type();
var _type4 = new vdl.Type();
var _type5 = new vdl.Type();
var _type6 = new vdl.Type();
var _type7 = new vdl.Type();
var _type8 = new vdl.Type();
var _type9 = new vdl.Type();
var _typeArgs = new vdl.Type();
var _typeCompComp = new vdl.Type();
var _typeComposites = new vdl.Type();
var _typeCompositesArray = new vdl.Type();
var _typeKeyScalars = new vdl.Type();
var _typeNamedArray = new vdl.Type();
var _typeNamedBool = new vdl.Type();
var _typeNamedByte = new vdl.Type();
var _typeNamedComplex128 = new vdl.Type();
var _typeNamedComplex64 = new vdl.Type();
var _typeNamedEnum = new vdl.Type();
var _typeNamedFloat32 = new vdl.Type();
var _typeNamedFloat64 = new vdl.Type();
var _typeNamedInt16 = new vdl.Type();
var _typeNamedInt32 = new vdl.Type();
var _typeNamedInt64 = new vdl.Type();
var _typeNamedList = new vdl.Type();
var _typeNamedMap = new vdl.Type();
var _typeNamedSet = new vdl.Type();
var _typeNamedString = new vdl.Type();
var _typeNamedStruct = new vdl.Type();
var _typeNamedUint16 = new vdl.Type();
var _typeNamedUint32 = new vdl.Type();
var _typeNamedUint64 = new vdl.Type();
var _typeNamedUnion = new vdl.Type();
var _typeNestedArgs = new vdl.Type();
var _typeScalars = new vdl.Type();
var _typeScalarsArray = new vdl.Type();
_type1.kind = vdl.Kind.LIST;
_type1.name = "";
_type1.elem = _typeScalars;
_type10.kind = vdl.Kind.LIST;
_type10.name = "";
_type10.elem = _type8;
_type11.kind = vdl.Kind.LIST;
_type11.name = "";
_type11.elem = vdl.Types.INT32;
_type12.kind = vdl.Kind.SET;
_type12.name = "";
_type12.key = vdl.Types.INT32;
_type13.kind = vdl.Kind.MAP;
_type13.name = "";
_type13.elem = vdl.Types.STRING;
_type13.key = vdl.Types.INT32;
_type14.kind = vdl.Kind.LIST;
_type14.name = "";
_type14.elem = vdl.Types.BYTE;
_type15.kind = vdl.Kind.LIST;
_type15.name = "";
_type15.elem = vdl.Types.STRING;
_type16.kind = vdl.Kind.SET;
_type16.name = "";
_type16.key = vdl.Types.STRING;
_type17.kind = vdl.Kind.MAP;
_type17.name = "";
_type17.elem = vdl.Types.INT64;
_type17.key = vdl.Types.STRING;
_type2.kind = vdl.Kind.SET;
_type2.name = "";
_type2.key = _typeKeyScalars;
_type3.kind = vdl.Kind.MAP;
_type3.name = "";
_type3.elem = _typeScalars;
_type3.key = vdl.Types.STRING;
_type4.kind = vdl.Kind.MAP;
_type4.name = "";
_type4.elem = _type5;
_type4.key = _typeKeyScalars;
_type5.kind = vdl.Kind.LIST;
_type5.name = "";
_type5.elem = _type6;
_type6.kind = vdl.Kind.MAP;
_type6.name = "";
_type6.elem = vdl.Types.COMPLEX128;
_type6.key = vdl.Types.STRING;
_type7.kind = vdl.Kind.LIST;
_type7.name = "";
_type7.elem = _typeComposites;
_type8.kind = vdl.Kind.MAP;
_type8.name = "";
_type8.elem = _typeComposites;
_type8.key = vdl.Types.STRING;
_type9.kind = vdl.Kind.MAP;
_type9.name = "";
_type9.elem = _type10;
_type9.key = _typeKeyScalars;
_typeArgs.kind = vdl.Kind.STRUCT;
_typeArgs.name = "v.io/x/ref/lib/vdl/testdata/base.Args";
_typeArgs.fields = [{name: "A", type: vdl.Types.INT32}, {name: "B", type: vdl.Types.INT32}];
_typeCompComp.kind = vdl.Kind.STRUCT;
_typeCompComp.name = "v.io/x/ref/lib/vdl/testdata/base.CompComp";
_typeCompComp.fields = [{name: "A0", type: _typeComposites}, {name: "A1", type: _typeCompositesArray}, {name: "A2", type: _type7}, {name: "A3", type: _type8}, {name: "A4", type: _type9}];
_typeComposites.kind = vdl.Kind.STRUCT;
_typeComposites.name = "v.io/x/ref/lib/vdl/testdata/base.Composites";
_typeComposites.fields = [{name: "A0", type: _typeScalars}, {name: "A1", type: _typeScalarsArray}, {name: "A2", type: _type1}, {name: "A3", type: _type2}, {name: "A4", type: _type3}, {name: "A5", type: _type4}];
_typeCompositesArray.kind = vdl.Kind.ARRAY;
_typeCompositesArray.name = "v.io/x/ref/lib/vdl/testdata/base.CompositesArray";
_typeCompositesArray.len = 2;
_typeCompositesArray.elem = _typeComposites;
_typeKeyScalars.kind = vdl.Kind.STRUCT;
_typeKeyScalars.name = "v.io/x/ref/lib/vdl/testdata/base.KeyScalars";
_typeKeyScalars.fields = [{name: "A0", type: vdl.Types.BOOL}, {name: "A1", type: vdl.Types.BYTE}, {name: "A2", type: vdl.Types.UINT16}, {name: "A3", type: vdl.Types.UINT32}, {name: "A4", type: vdl.Types.UINT64}, {name: "A5", type: vdl.Types.INT16}, {name: "A6", type: vdl.Types.INT32}, {name: "A7", type: vdl.Types.INT64}, {name: "A8", type: vdl.Types.FLOAT32}, {name: "A9", type: vdl.Types.FLOAT64}, {name: "A10", type: vdl.Types.COMPLEX64}, {name: "A11", type: vdl.Types.COMPLEX128}, {name: "A12", type: vdl.Types.STRING}, {name: "B0", type: _typeNamedBool}, {name: "B1", type: _typeNamedByte}, {name: "B2", type: _typeNamedUint16}, {name: "B3", type: _typeNamedUint32}, {name: "B4", type: _typeNamedUint64}, {name: "B5", type: _typeNamedInt16}, {name: "B6", type: _typeNamedInt32}, {name: "B7", type: _typeNamedInt64}, {name: "B8", type: _typeNamedFloat32}, {name: "B9", type: _typeNamedFloat64}, {name: "B10", type: _typeNamedComplex64}, {name: "B11", type: _typeNamedComplex128}, {name: "B12", type: _typeNamedString}];
_typeNamedArray.kind = vdl.Kind.ARRAY;
_typeNamedArray.name = "v.io/x/ref/lib/vdl/testdata/base.NamedArray";
_typeNamedArray.len = 2;
_typeNamedArray.elem = vdl.Types.BOOL;
_typeNamedBool.kind = vdl.Kind.BOOL;
_typeNamedBool.name = "v.io/x/ref/lib/vdl/testdata/base.NamedBool";
_typeNamedByte.kind = vdl.Kind.BYTE;
_typeNamedByte.name = "v.io/x/ref/lib/vdl/testdata/base.NamedByte";
_typeNamedComplex128.kind = vdl.Kind.COMPLEX128;
_typeNamedComplex128.name = "v.io/x/ref/lib/vdl/testdata/base.NamedComplex128";
_typeNamedComplex64.kind = vdl.Kind.COMPLEX64;
_typeNamedComplex64.name = "v.io/x/ref/lib/vdl/testdata/base.NamedComplex64";
_typeNamedEnum.kind = vdl.Kind.ENUM;
_typeNamedEnum.name = "v.io/x/ref/lib/vdl/testdata/base.NamedEnum";
_typeNamedEnum.labels = ["A", "B", "C"];
_typeNamedFloat32.kind = vdl.Kind.FLOAT32;
_typeNamedFloat32.name = "v.io/x/ref/lib/vdl/testdata/base.NamedFloat32";
_typeNamedFloat64.kind = vdl.Kind.FLOAT64;
_typeNamedFloat64.name = "v.io/x/ref/lib/vdl/testdata/base.NamedFloat64";
_typeNamedInt16.kind = vdl.Kind.INT16;
_typeNamedInt16.name = "v.io/x/ref/lib/vdl/testdata/base.NamedInt16";
_typeNamedInt32.kind = vdl.Kind.INT32;
_typeNamedInt32.name = "v.io/x/ref/lib/vdl/testdata/base.NamedInt32";
_typeNamedInt64.kind = vdl.Kind.INT64;
_typeNamedInt64.name = "v.io/x/ref/lib/vdl/testdata/base.NamedInt64";
_typeNamedList.kind = vdl.Kind.LIST;
_typeNamedList.name = "v.io/x/ref/lib/vdl/testdata/base.NamedList";
_typeNamedList.elem = vdl.Types.UINT32;
_typeNamedMap.kind = vdl.Kind.MAP;
_typeNamedMap.name = "v.io/x/ref/lib/vdl/testdata/base.NamedMap";
_typeNamedMap.elem = vdl.Types.FLOAT32;
_typeNamedMap.key = vdl.Types.STRING;
_typeNamedSet.kind = vdl.Kind.SET;
_typeNamedSet.name = "v.io/x/ref/lib/vdl/testdata/base.NamedSet";
_typeNamedSet.key = vdl.Types.STRING;
_typeNamedString.kind = vdl.Kind.STRING;
_typeNamedString.name = "v.io/x/ref/lib/vdl/testdata/base.NamedString";
_typeNamedStruct.kind = vdl.Kind.STRUCT;
_typeNamedStruct.name = "v.io/x/ref/lib/vdl/testdata/base.NamedStruct";
_typeNamedStruct.fields = [{name: "A", type: vdl.Types.BOOL}, {name: "B", type: vdl.Types.STRING}, {name: "C", type: vdl.Types.INT32}];
_typeNamedUint16.kind = vdl.Kind.UINT16;
_typeNamedUint16.name = "v.io/x/ref/lib/vdl/testdata/base.NamedUint16";
_typeNamedUint32.kind = vdl.Kind.UINT32;
_typeNamedUint32.name = "v.io/x/ref/lib/vdl/testdata/base.NamedUint32";
_typeNamedUint64.kind = vdl.Kind.UINT64;
_typeNamedUint64.name = "v.io/x/ref/lib/vdl/testdata/base.NamedUint64";
_typeNamedUnion.kind = vdl.Kind.UNION;
_typeNamedUnion.name = "v.io/x/ref/lib/vdl/testdata/base.NamedUnion";
_typeNamedUnion.fields = [{name: "A", type: vdl.Types.BOOL}, {name: "B", type: vdl.Types.STRING}, {name: "C", type: vdl.Types.INT32}];
_typeNestedArgs.kind = vdl.Kind.STRUCT;
_typeNestedArgs.name = "v.io/x/ref/lib/vdl/testdata/base.NestedArgs";
_typeNestedArgs.fields = [{name: "Args", type: _typeArgs}];
_typeScalars.kind = vdl.Kind.STRUCT;
_typeScalars.name = "v.io/x/ref/lib/vdl/testdata/base.Scalars";
_typeScalars.fields = [{name: "A0", type: vdl.Types.BOOL}, {name: "A1", type: vdl.Types.BYTE}, {name: "A2", type: vdl.Types.UINT16}, {name: "A3", type: vdl.Types.UINT32}, {name: "A4", type: vdl.Types.UINT64}, {name: "A5", type: vdl.Types.INT16}, {name: "A6", type: vdl.Types.INT32}, {name: "A7", type: vdl.Types.INT64}, {name: "A8", type: vdl.Types.FLOAT32}, {name: "A9", type: vdl.Types.FLOAT64}, {name: "A10", type: vdl.Types.COMPLEX64}, {name: "A11", type: vdl.Types.COMPLEX128}, {name: "A12", type: vdl.Types.STRING}, {name: "A13", type: vdl.Types.ERROR}, {name: "A14", type: vdl.Types.ANY}, {name: "A15", type: vdl.Types.TYPEOBJECT}, {name: "B0", type: _typeNamedBool}, {name: "B1", type: _typeNamedByte}, {name: "B2", type: _typeNamedUint16}, {name: "B3", type: _typeNamedUint32}, {name: "B4", type: _typeNamedUint64}, {name: "B5", type: _typeNamedInt16}, {name: "B6", type: _typeNamedInt32}, {name: "B7", type: _typeNamedInt64}, {name: "B8", type: _typeNamedFloat32}, {name: "B9", type: _typeNamedFloat64}, {name: "B10", type: _typeNamedComplex64}, {name: "B11", type: _typeNamedComplex128}, {name: "B12", type: _typeNamedString}, {name: "B13", type: _typeNamedEnum}, {name: "B14", type: _typeNamedUnion}];
_typeScalarsArray.kind = vdl.Kind.ARRAY;
_typeScalarsArray.name = "v.io/x/ref/lib/vdl/testdata/base.ScalarsArray";
_typeScalarsArray.len = 2;
_typeScalarsArray.elem = _typeScalars;
_type1.freeze();
_type10.freeze();
_type11.freeze();
_type12.freeze();
_type13.freeze();
_type14.freeze();
_type15.freeze();
_type16.freeze();
_type17.freeze();
_type2.freeze();
_type3.freeze();
_type4.freeze();
_type5.freeze();
_type6.freeze();
_type7.freeze();
_type8.freeze();
_type9.freeze();
_typeArgs.freeze();
_typeCompComp.freeze();
_typeComposites.freeze();
_typeCompositesArray.freeze();
_typeKeyScalars.freeze();
_typeNamedArray.freeze();
_typeNamedBool.freeze();
_typeNamedByte.freeze();
_typeNamedComplex128.freeze();
_typeNamedComplex64.freeze();
_typeNamedEnum.freeze();
_typeNamedFloat32.freeze();
_typeNamedFloat64.freeze();
_typeNamedInt16.freeze();
_typeNamedInt32.freeze();
_typeNamedInt64.freeze();
_typeNamedList.freeze();
_typeNamedMap.freeze();
_typeNamedSet.freeze();
_typeNamedString.freeze();
_typeNamedStruct.freeze();
_typeNamedUint16.freeze();
_typeNamedUint32.freeze();
_typeNamedUint64.freeze();
_typeNamedUnion.freeze();
_typeNestedArgs.freeze();
_typeScalars.freeze();
_typeScalarsArray.freeze();
module.exports.Args = (vdl.Registry.lookupOrCreateConstructor(_typeArgs));
module.exports.CompComp = (vdl.Registry.lookupOrCreateConstructor(_typeCompComp));
module.exports.Composites = (vdl.Registry.lookupOrCreateConstructor(_typeComposites));
module.exports.CompositesArray = (vdl.Registry.lookupOrCreateConstructor(_typeCompositesArray));
module.exports.KeyScalars = (vdl.Registry.lookupOrCreateConstructor(_typeKeyScalars));
module.exports.NamedArray = (vdl.Registry.lookupOrCreateConstructor(_typeNamedArray));
module.exports.NamedBool = (vdl.Registry.lookupOrCreateConstructor(_typeNamedBool));
module.exports.NamedByte = (vdl.Registry.lookupOrCreateConstructor(_typeNamedByte));
module.exports.NamedComplex128 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedComplex128));
module.exports.NamedComplex64 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedComplex64));
module.exports.NamedEnum = {
  A: canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedEnum))('A', true), _typeNamedEnum),
  B: canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedEnum))('B', true), _typeNamedEnum),
  C: canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedEnum))('C', true), _typeNamedEnum),
};
module.exports.NamedFloat32 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedFloat32));
module.exports.NamedFloat64 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedFloat64));
module.exports.NamedInt16 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedInt16));
module.exports.NamedInt32 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedInt32));
module.exports.NamedInt64 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedInt64));
module.exports.NamedList = (vdl.Registry.lookupOrCreateConstructor(_typeNamedList));
module.exports.NamedMap = (vdl.Registry.lookupOrCreateConstructor(_typeNamedMap));
module.exports.NamedSet = (vdl.Registry.lookupOrCreateConstructor(_typeNamedSet));
module.exports.NamedString = (vdl.Registry.lookupOrCreateConstructor(_typeNamedString));
module.exports.NamedStruct = (vdl.Registry.lookupOrCreateConstructor(_typeNamedStruct));
module.exports.NamedUint16 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedUint16));
module.exports.NamedUint32 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedUint32));
module.exports.NamedUint64 = (vdl.Registry.lookupOrCreateConstructor(_typeNamedUint64));
module.exports.NamedUnion = (vdl.Registry.lookupOrCreateConstructor(_typeNamedUnion));
module.exports.NestedArgs = (vdl.Registry.lookupOrCreateConstructor(_typeNestedArgs));
module.exports.Scalars = (vdl.Registry.lookupOrCreateConstructor(_typeScalars));
module.exports.ScalarsArray = (vdl.Registry.lookupOrCreateConstructor(_typeScalarsArray));




// Consts:

  module.exports.Cbool = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.BOOL))(true, true), vdl.Types.BOOL);

  module.exports.Cbyte = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.BYTE))(1, true), vdl.Types.BYTE);

  module.exports.Cint32 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.INT32))(2, true), vdl.Types.INT32);

  module.exports.Cint64 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.INT64))(new vdl.BigInt(1, new Uint8Array([0x3])), true), vdl.Types.INT64);

  module.exports.Cuint32 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.UINT32))(4, true), vdl.Types.UINT32);

  module.exports.Cuint64 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.UINT64))(new vdl.BigInt(1, new Uint8Array([0x5])), true), vdl.Types.UINT64);

  module.exports.Cfloat32 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.FLOAT32))(6, true), vdl.Types.FLOAT32);

  module.exports.Cfloat64 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.FLOAT64))(7, true), vdl.Types.FLOAT64);

  module.exports.CNamedBool = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedBool))(true, true), _typeNamedBool);

  module.exports.CNamedStruct = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedStruct))({
  'a': true,
  'b': "test",
  'c': 0,
}, true), _typeNamedStruct);

  module.exports.Ccomplex64 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.COMPLEX64))(new vdl.Complex(8.000000, 9.000000), true), vdl.Types.COMPLEX64);

  module.exports.Ccomplex128 = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.COMPLEX128))(new vdl.Complex(10.000000, 11.000000), true), vdl.Types.COMPLEX128);

  module.exports.Cstring = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.STRING))("foo", true), vdl.Types.STRING);

  module.exports.Cenum = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedEnum))('A', true), _typeNamedEnum);

  module.exports.Cunion = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedUnion))({ "a": true }, true), _typeNamedUnion);

  module.exports.Carray = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeNamedArray))([
true,
false,
], true), _typeNamedArray);

  module.exports.Clist = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_type11))([
1,
2,
3,
], true), _type11);

  module.exports.Cset = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_type12))(new Set([
  1, 
  2, 
  3, ]), true), _type12);

  module.exports.cmap = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_type13))(new Map([
  [1, "A"],
  [2, "B"],
  [3, "C"]]), true), _type13);

  module.exports.Cargs = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeArgs))({
  'a': 1,
  'b': 2,
}, true), _typeArgs);

  module.exports.CScalars = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(_typeScalars))({
  'a0': true,
  'a1': 1,
  'a2': 2,
  'a3': 3,
  'a4': new vdl.BigInt(1, new Uint8Array([0x4])),
  'a5': 5,
  'a6': 6,
  'a7': new vdl.BigInt(1, new Uint8Array([0x7])),
  'a8': 8,
  'a9': 9,
  'a10': new vdl.Complex(10.000000, 0.000000),
  'a11': new vdl.Complex(11.000000, 0.000000),
  'a12': "abc",
  'a13': null,
  'a14': canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.BOOL))(false, true), vdl.Types.BOOL),
  'a15': vdl.Types.BOOL,
  'b0': true,
  'b1': 1,
  'b2': 2,
  'b3': 3,
  'b4': new vdl.BigInt(1, new Uint8Array([0x4])),
  'b5': 5,
  'b6': 6,
  'b7': new vdl.BigInt(1, new Uint8Array([0x7])),
  'b8': 8,
  'b9': 9,
  'b10': new vdl.Complex(10.000000, 0.000000),
  'b11': new vdl.Complex(11.000000, 0.000000),
  'b12': "abc",
  'b13': 'B',
  'b14': { "c": 123 },
}, true), _typeScalars);

  module.exports.True = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.BOOL))(true, true), vdl.Types.BOOL);

  module.exports.Foo = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.STRING))("foo", true), vdl.Types.STRING);

  module.exports.Five = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.INT32))(5, true), vdl.Types.INT32);

  module.exports.Six = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.UINT64))(new vdl.BigInt(1, new Uint8Array([0x6])), true), vdl.Types.UINT64);

  module.exports.SixSquared = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.UINT64))(new vdl.BigInt(1, new Uint8Array([0x24])), true), vdl.Types.UINT64);

  module.exports.FiveSquared = canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.INT32))(25, true), vdl.Types.INT32);

  module.exports.CTypeObject_bool = vdl.Types.BOOL;

  module.exports.CTypeObject_string = vdl.Types.STRING;

  module.exports.CTypeObject_bytes = _type14;

  module.exports.CTypeObject_byte = vdl.Types.BYTE;

  module.exports.CTypeObject_uint16 = vdl.Types.UINT16;

  module.exports.CTypeObject_int16 = vdl.Types.INT16;

  module.exports.CTypeObject_float32 = vdl.Types.FLOAT32;

  module.exports.CTypeObject_complex64 = vdl.Types.COMPLEX64;

  module.exports.CTypeObject_enum = _typeNamedEnum;

  module.exports.CTypeObject_Array = _typeNamedArray;

  module.exports.CTypeObject_List = _type15;

  module.exports.CTypeObject_Set = _type16;

  module.exports.CTypeObject_Map = _type17;

  module.exports.CTypeObject_Struct = _typeScalars;

  module.exports.CTypeObject_Union = _typeNamedUnion;

  module.exports.CTypeObject_TypeObject = vdl.Types.TYPEOBJECT;

  module.exports.CTypeObject_Any = vdl.Types.ANY;



// Errors:

module.exports.NoParams1Error = makeError('v.io/x/ref/lib/vdl/testdata/base.NoParams1', actions.NO_RETRY, {
  'en': '{1:}{2:} en msg',
}, [
]);


module.exports.NoParams2Error = makeError('v.io/x/ref/lib/vdl/testdata/base.NoParams2', actions.RETRY_REFETCH, {
  'en': '{1:}{2:} en msg',
  'fr': '{1:}{2:} fr msg',
}, [
]);


module.exports.WithParams1Error = makeError('v.io/x/ref/lib/vdl/testdata/base.WithParams1', actions.NO_RETRY, {
  'en': '{1:}{2:} en x={3} y={4}',
}, [
  vdl.Types.STRING,
  vdl.Types.INT32,
]);


module.exports.WithParams2Error = makeError('v.io/x/ref/lib/vdl/testdata/base.WithParams2', actions.RETRY_REFETCH, {
  'en': '{1:}{2:} en x={3} y={4}',
  'fr': '{1:}{2:} fr y={4} x={3}',
}, [
  vdl.Types.STRING,
  vdl.Types.INT32,
]);


module.exports.notExportedError = makeError('v.io/x/ref/lib/vdl/testdata/base.notExported', actions.NO_RETRY, {
  'en': '{1:}{2:} en x={3} y={4}',
}, [
  vdl.Types.STRING,
  vdl.Types.INT32,
]);




// Services:

  
    
function ServiceA(){}
module.exports.ServiceA = ServiceA

    
      
ServiceA.prototype.methodA1 = function(ctx, serverCall) {
  throw new Error('Method MethodA1 not implemented');
};
    
      
ServiceA.prototype.methodA2 = function(ctx, serverCall, a, b) {
  throw new Error('Method MethodA2 not implemented');
};
    
      
ServiceA.prototype.methodA3 = function(ctx, serverCall, a) {
  throw new Error('Method MethodA3 not implemented');
};
    
      
ServiceA.prototype.methodA4 = function(ctx, serverCall, a) {
  throw new Error('Method MethodA4 not implemented');
};
     

    
ServiceA.prototype._serviceDescription = {
  name: 'ServiceA',
  pkgPath: 'v.io/x/ref/lib/vdl/testdata/base',
  doc: "",
  embeds: [],
  methods: [
    
      
    {
    name: 'MethodA1',
    doc: "",
    inArgs: [],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'MethodA2',
    doc: "",
    inArgs: [{
      name: 'a',
      doc: "",
      type: vdl.Types.INT32
    },
    {
      name: 'b',
      doc: "",
      type: vdl.Types.STRING
    },
    ],
    outArgs: [{
      name: 's',
      doc: "",
      type: vdl.Types.STRING
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'MethodA3',
    doc: "",
    inArgs: [{
      name: 'a',
      doc: "",
      type: vdl.Types.INT32
    },
    ],
    outArgs: [{
      name: 's',
      doc: "",
      type: vdl.Types.STRING
    },
    ],
    inStream: null,
    outStream: {
      name: '',
      doc: '',
      type: _typeScalars
    },
    tags: [canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.STRING))("tag", true), vdl.Types.STRING), canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.UINT64))(new vdl.BigInt(1, new Uint8Array([0x6])), true), vdl.Types.UINT64), ]
  },
    
      
    {
    name: 'MethodA4',
    doc: "",
    inArgs: [{
      name: 'a',
      doc: "",
      type: vdl.Types.INT32
    },
    ],
    outArgs: [],
    inStream: {
      name: '',
      doc: '',
      type: vdl.Types.INT32
    },
    outStream: {
      name: '',
      doc: '',
      type: vdl.Types.STRING
    },
    tags: []
  },
     
  ]
};

  
    
function ServiceB(){}
module.exports.ServiceB = ServiceB

    
      
ServiceB.prototype.methodB1 = function(ctx, serverCall, a, b) {
  throw new Error('Method MethodB1 not implemented');
};
    
      
ServiceB.prototype.methodA1 = function(ctx, serverCall) {
  throw new Error('Method MethodA1 not implemented');
};
    
      
ServiceB.prototype.methodA2 = function(ctx, serverCall, a, b) {
  throw new Error('Method MethodA2 not implemented');
};
    
      
ServiceB.prototype.methodA3 = function(ctx, serverCall, a) {
  throw new Error('Method MethodA3 not implemented');
};
    
      
ServiceB.prototype.methodA4 = function(ctx, serverCall, a) {
  throw new Error('Method MethodA4 not implemented');
};
     

    
ServiceB.prototype._serviceDescription = {
  name: 'ServiceB',
  pkgPath: 'v.io/x/ref/lib/vdl/testdata/base',
  doc: "",
  embeds: [{
      name: 'ServiceA',
      pkgPath: 'v.io/x/ref/lib/vdl/testdata/base',
      doc: ""
    },
    ],
  methods: [
    
      
    {
    name: 'MethodB1',
    doc: "",
    inArgs: [{
      name: 'a',
      doc: "",
      type: _typeScalars
    },
    {
      name: 'b',
      doc: "",
      type: _typeComposites
    },
    ],
    outArgs: [{
      name: 'c',
      doc: "",
      type: _typeCompComp
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'MethodA1',
    doc: "",
    inArgs: [],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'MethodA2',
    doc: "",
    inArgs: [{
      name: 'a',
      doc: "",
      type: vdl.Types.INT32
    },
    {
      name: 'b',
      doc: "",
      type: vdl.Types.STRING
    },
    ],
    outArgs: [{
      name: 's',
      doc: "",
      type: vdl.Types.STRING
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'MethodA3',
    doc: "",
    inArgs: [{
      name: 'a',
      doc: "",
      type: vdl.Types.INT32
    },
    ],
    outArgs: [{
      name: 's',
      doc: "",
      type: vdl.Types.STRING
    },
    ],
    inStream: null,
    outStream: {
      name: '',
      doc: '',
      type: _typeScalars
    },
    tags: [canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.STRING))("tag", true), vdl.Types.STRING), canonicalize.reduce(new (vdl.Registry.lookupOrCreateConstructor(vdl.Types.UINT64))(new vdl.BigInt(1, new Uint8Array([0x6])), true), vdl.Types.UINT64), ]
  },
    
      
    {
    name: 'MethodA4',
    doc: "",
    inArgs: [{
      name: 'a',
      doc: "",
      type: vdl.Types.INT32
    },
    ],
    outArgs: [],
    inStream: {
      name: '',
      doc: '',
      type: vdl.Types.INT32
    },
    outStream: {
      name: '',
      doc: '',
      type: vdl.Types.STRING
    },
    tags: []
  },
     
  ]
};

   
 


