// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
var vdl = require('../../../../vdl');
var canonicalize = require('../../../../vdl/canonicalize');






module.exports = {};



// Types:
var _type1 = new vdl.Type();
var _type2 = new vdl.Type();
var _type3 = new vdl.Type();
var _typeControlKind = new vdl.Type();
var _typeDumpAtom = new vdl.Type();
var _typeDumpKind = new vdl.Type();
var _typePrimitive = new vdl.Type();
var _typetypeId = new vdl.Type();
var _typewireArray = new vdl.Type();
var _typewireEnum = new vdl.Type();
var _typewireField = new vdl.Type();
var _typewireList = new vdl.Type();
var _typewireMap = new vdl.Type();
var _typewireNamed = new vdl.Type();
var _typewireOptional = new vdl.Type();
var _typewireSet = new vdl.Type();
var _typewireStruct = new vdl.Type();
var _typewireType = new vdl.Type();
var _typewireUnion = new vdl.Type();
_type1.kind = vdl.kind.LIST;
_type1.name = "";
_type1.elem = vdl.types.BYTE;
_type2.kind = vdl.kind.LIST;
_type2.name = "";
_type2.elem = vdl.types.STRING;
_type3.kind = vdl.kind.LIST;
_type3.name = "";
_type3.elem = _typewireField;
_typeControlKind.kind = vdl.kind.ENUM;
_typeControlKind.name = "v.io/v23/vom.ControlKind";
_typeControlKind.labels = ["Nil", "End", "IncompleteType"];
_typeDumpAtom.kind = vdl.kind.STRUCT;
_typeDumpAtom.name = "v.io/v23/vom.DumpAtom";
_typeDumpAtom.fields = [{name: "Kind", type: _typeDumpKind}, {name: "Bytes", type: _type1}, {name: "Data", type: _typePrimitive}, {name: "Debug", type: vdl.types.STRING}];
_typeDumpKind.kind = vdl.kind.ENUM;
_typeDumpKind.name = "v.io/v23/vom.DumpKind";
_typeDumpKind.labels = ["Version", "Control", "MsgId", "TypeMsg", "ValueMsg", "MsgLen", "AnyMsgLen", "AnyLensLen", "TypeIdsLen", "TypeId", "PrimValue", "ByteLen", "ValueLen", "Index", "WireTypeIndex"];
_typePrimitive.kind = vdl.kind.UNION;
_typePrimitive.name = "v.io/v23/vom.Primitive";
_typePrimitive.fields = [{name: "PBool", type: vdl.types.BOOL}, {name: "PByte", type: vdl.types.BYTE}, {name: "PUint", type: vdl.types.UINT64}, {name: "PInt", type: vdl.types.INT64}, {name: "PFloat", type: vdl.types.FLOAT64}, {name: "PString", type: vdl.types.STRING}, {name: "PControl", type: _typeControlKind}];
_typetypeId.kind = vdl.kind.UINT64;
_typetypeId.name = "v.io/v23/vom.typeId";
_typewireArray.kind = vdl.kind.STRUCT;
_typewireArray.name = "v.io/v23/vom.wireArray";
_typewireArray.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Elem", type: _typetypeId}, {name: "Len", type: vdl.types.UINT64}];
_typewireEnum.kind = vdl.kind.STRUCT;
_typewireEnum.name = "v.io/v23/vom.wireEnum";
_typewireEnum.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Labels", type: _type2}];
_typewireField.kind = vdl.kind.STRUCT;
_typewireField.name = "v.io/v23/vom.wireField";
_typewireField.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Type", type: _typetypeId}];
_typewireList.kind = vdl.kind.STRUCT;
_typewireList.name = "v.io/v23/vom.wireList";
_typewireList.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Elem", type: _typetypeId}];
_typewireMap.kind = vdl.kind.STRUCT;
_typewireMap.name = "v.io/v23/vom.wireMap";
_typewireMap.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Key", type: _typetypeId}, {name: "Elem", type: _typetypeId}];
_typewireNamed.kind = vdl.kind.STRUCT;
_typewireNamed.name = "v.io/v23/vom.wireNamed";
_typewireNamed.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Base", type: _typetypeId}];
_typewireOptional.kind = vdl.kind.STRUCT;
_typewireOptional.name = "v.io/v23/vom.wireOptional";
_typewireOptional.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Elem", type: _typetypeId}];
_typewireSet.kind = vdl.kind.STRUCT;
_typewireSet.name = "v.io/v23/vom.wireSet";
_typewireSet.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Key", type: _typetypeId}];
_typewireStruct.kind = vdl.kind.STRUCT;
_typewireStruct.name = "v.io/v23/vom.wireStruct";
_typewireStruct.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Fields", type: _type3}];
_typewireType.kind = vdl.kind.UNION;
_typewireType.name = "v.io/v23/vom.wireType";
_typewireType.fields = [{name: "NamedT", type: _typewireNamed}, {name: "EnumT", type: _typewireEnum}, {name: "ArrayT", type: _typewireArray}, {name: "ListT", type: _typewireList}, {name: "SetT", type: _typewireSet}, {name: "MapT", type: _typewireMap}, {name: "StructT", type: _typewireStruct}, {name: "UnionT", type: _typewireUnion}, {name: "OptionalT", type: _typewireOptional}];
_typewireUnion.kind = vdl.kind.STRUCT;
_typewireUnion.name = "v.io/v23/vom.wireUnion";
_typewireUnion.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Fields", type: _type3}];
_type1.freeze();
_type2.freeze();
_type3.freeze();
_typeControlKind.freeze();
_typeDumpAtom.freeze();
_typeDumpKind.freeze();
_typePrimitive.freeze();
_typetypeId.freeze();
_typewireArray.freeze();
_typewireEnum.freeze();
_typewireField.freeze();
_typewireList.freeze();
_typewireMap.freeze();
_typewireNamed.freeze();
_typewireOptional.freeze();
_typewireSet.freeze();
_typewireStruct.freeze();
_typewireType.freeze();
_typewireUnion.freeze();
module.exports.ControlKind = {
  NIL: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeControlKind))('Nil', true), _typeControlKind),
  END: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeControlKind))('End', true), _typeControlKind),
  INCOMPLETE_TYPE: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeControlKind))('IncompleteType', true), _typeControlKind),
};
module.exports.DumpAtom = (vdl.registry.lookupOrCreateConstructor(_typeDumpAtom));
module.exports.DumpKind = {
  VERSION: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('Version', true), _typeDumpKind),
  CONTROL: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('Control', true), _typeDumpKind),
  MSG_ID: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('MsgId', true), _typeDumpKind),
  TYPE_MSG: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('TypeMsg', true), _typeDumpKind),
  VALUE_MSG: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('ValueMsg', true), _typeDumpKind),
  MSG_LEN: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('MsgLen', true), _typeDumpKind),
  ANY_MSG_LEN: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('AnyMsgLen', true), _typeDumpKind),
  ANY_LENS_LEN: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('AnyLensLen', true), _typeDumpKind),
  TYPE_IDS_LEN: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('TypeIdsLen', true), _typeDumpKind),
  TYPE_ID: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('TypeId', true), _typeDumpKind),
  PRIM_VALUE: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('PrimValue', true), _typeDumpKind),
  BYTE_LEN: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('ByteLen', true), _typeDumpKind),
  VALUE_LEN: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('ValueLen', true), _typeDumpKind),
  INDEX: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('Index', true), _typeDumpKind),
  WIRE_TYPE_INDEX: canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typeDumpKind))('WireTypeIndex', true), _typeDumpKind),
};
module.exports.Primitive = (vdl.registry.lookupOrCreateConstructor(_typePrimitive));
module.exports.typeId = (vdl.registry.lookupOrCreateConstructor(_typetypeId));
module.exports.wireArray = (vdl.registry.lookupOrCreateConstructor(_typewireArray));
module.exports.wireEnum = (vdl.registry.lookupOrCreateConstructor(_typewireEnum));
module.exports.wireField = (vdl.registry.lookupOrCreateConstructor(_typewireField));
module.exports.wireList = (vdl.registry.lookupOrCreateConstructor(_typewireList));
module.exports.wireMap = (vdl.registry.lookupOrCreateConstructor(_typewireMap));
module.exports.wireNamed = (vdl.registry.lookupOrCreateConstructor(_typewireNamed));
module.exports.wireOptional = (vdl.registry.lookupOrCreateConstructor(_typewireOptional));
module.exports.wireSet = (vdl.registry.lookupOrCreateConstructor(_typewireSet));
module.exports.wireStruct = (vdl.registry.lookupOrCreateConstructor(_typewireStruct));
module.exports.wireType = (vdl.registry.lookupOrCreateConstructor(_typewireType));
module.exports.wireUnion = (vdl.registry.lookupOrCreateConstructor(_typewireUnion));




// Consts:

  module.exports.WireIdBool = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x1])), true), _typetypeId);

  module.exports.WireIdByte = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x2])), true), _typetypeId);

  module.exports.WireIdString = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x3])), true), _typetypeId);

  module.exports.WireIdUint16 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x4])), true), _typetypeId);

  module.exports.WireIdUint32 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x5])), true), _typetypeId);

  module.exports.WireIdUint64 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x6])), true), _typetypeId);

  module.exports.WireIdInt16 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x7])), true), _typetypeId);

  module.exports.WireIdInt32 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x8])), true), _typetypeId);

  module.exports.WireIdInt64 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x9])), true), _typetypeId);

  module.exports.WireIdFloat32 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0xa])), true), _typetypeId);

  module.exports.WireIdFloat64 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0xb])), true), _typetypeId);

  module.exports.WireIdComplex64 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0xc])), true), _typetypeId);

  module.exports.WireIdComplex128 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0xd])), true), _typetypeId);

  module.exports.WireIdTypeObject = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0xe])), true), _typetypeId);

  module.exports.WireIdAny = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0xf])), true), _typetypeId);

  module.exports.WireIdInt8 = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x10])), true), _typetypeId);

  module.exports.WireIdByteList = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x27])), true), _typetypeId);

  module.exports.WireIdStringList = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x28])), true), _typetypeId);

  module.exports.WireIdFirstUserType = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(_typetypeId))(new vdl.BigInt(1, new Uint8Array([0x29])), true), _typetypeId);

  module.exports.WireCtrlNil = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(224, true), vdl.types.BYTE);

  module.exports.WireCtrlEnd = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(225, true), vdl.types.BYTE);

  module.exports.WireCtrlValueFirstChunk = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(226, true), vdl.types.BYTE);

  module.exports.WireCtrlValueChunk = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(227, true), vdl.types.BYTE);

  module.exports.WireCtrlValueLastChunk = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(228, true), vdl.types.BYTE);

  module.exports.WireCtrlTypeFirstChunk = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(229, true), vdl.types.BYTE);

  module.exports.WireCtrlTypeChunk = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(230, true), vdl.types.BYTE);

  module.exports.WireCtrlTypeLastChunk = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(231, true), vdl.types.BYTE);

  module.exports.WireCtrlTypeIncomplete = canonicalize.reduce(new (vdl.registry.lookupOrCreateConstructor(vdl.types.BYTE))(232, true), vdl.types.BYTE);



// Errors:



// Services:

   

   
 


