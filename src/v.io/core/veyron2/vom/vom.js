// This file was auto-generated by the veyron vdl tool.
var vom = require('../../../.././vom/vom');





module.exports = {};



// Types:
var _type1 = new vom.Type();
var _type2 = new vom.Type();
var _type3 = new vom.Type();
var _typeDumpAtom = new vom.Type();
var _typeDumpKind = new vom.Type();
var _typePrimitive = new vom.Type();
var _typeTypeID = new vom.Type();
var _typeWireArray = new vom.Type();
var _typeWireEnum = new vom.Type();
var _typeWireField = new vom.Type();
var _typeWireList = new vom.Type();
var _typeWireMap = new vom.Type();
var _typeWireNamed = new vom.Type();
var _typeWireOptional = new vom.Type();
var _typeWireSet = new vom.Type();
var _typeWireStruct = new vom.Type();
var _typeWireUnion = new vom.Type();
_type1.kind = vom.Kind.LIST;
_type1.name = "";
_type1.elem = vom.Types.BYTE;
_type2.kind = vom.Kind.LIST;
_type2.name = "";
_type2.elem = vom.Types.STRING;
_type3.kind = vom.Kind.LIST;
_type3.name = "";
_type3.elem = _typeWireField;
_typeDumpAtom.kind = vom.Kind.STRUCT;
_typeDumpAtom.name = "v.io/core/veyron2/vom.DumpAtom";
_typeDumpAtom.fields = [{name: "Kind", type: _typeDumpKind}, {name: "Bytes", type: _type1}, {name: "Data", type: _typePrimitive}, {name: "Debug", type: vom.Types.STRING}];
_typeDumpKind.kind = vom.Kind.ENUM;
_typeDumpKind.name = "v.io/core/veyron2/vom.DumpKind";
_typeDumpKind.labels = ["Magic", "MsgID", "TypeMsg", "ValueMsg", "MsgLen", "TypeID", "PrimValue", "ByteLen", "ValueLen", "Index", "End", "NilValue", "Exists"];
_typePrimitive.kind = vom.Kind.ONEOF;
_typePrimitive.name = "v.io/core/veyron2/vom.Primitive";
_typePrimitive.fields = [{name: "PBool", type: vom.Types.BOOL}, {name: "PByte", type: vom.Types.BYTE}, {name: "PUint", type: vom.Types.UINT64}, {name: "PInt", type: vom.Types.INT64}, {name: "PFloat", type: vom.Types.FLOAT64}, {name: "PString", type: vom.Types.STRING}];
_typeTypeID.kind = vom.Kind.UINT64;
_typeTypeID.name = "v.io/core/veyron2/vom.TypeID";
_typeWireArray.kind = vom.Kind.STRUCT;
_typeWireArray.name = "v.io/core/veyron2/vom.WireArray";
_typeWireArray.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Elem", type: _typeTypeID}, {name: "Len", type: vom.Types.UINT64}];
_typeWireEnum.kind = vom.Kind.STRUCT;
_typeWireEnum.name = "v.io/core/veyron2/vom.WireEnum";
_typeWireEnum.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Labels", type: _type2}];
_typeWireField.kind = vom.Kind.STRUCT;
_typeWireField.name = "v.io/core/veyron2/vom.WireField";
_typeWireField.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Type", type: _typeTypeID}];
_typeWireList.kind = vom.Kind.STRUCT;
_typeWireList.name = "v.io/core/veyron2/vom.WireList";
_typeWireList.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Elem", type: _typeTypeID}];
_typeWireMap.kind = vom.Kind.STRUCT;
_typeWireMap.name = "v.io/core/veyron2/vom.WireMap";
_typeWireMap.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Key", type: _typeTypeID}, {name: "Elem", type: _typeTypeID}];
_typeWireNamed.kind = vom.Kind.STRUCT;
_typeWireNamed.name = "v.io/core/veyron2/vom.WireNamed";
_typeWireNamed.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Base", type: _typeTypeID}];
_typeWireOptional.kind = vom.Kind.STRUCT;
_typeWireOptional.name = "v.io/core/veyron2/vom.WireOptional";
_typeWireOptional.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Elem", type: _typeTypeID}];
_typeWireSet.kind = vom.Kind.STRUCT;
_typeWireSet.name = "v.io/core/veyron2/vom.WireSet";
_typeWireSet.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Key", type: _typeTypeID}];
_typeWireStruct.kind = vom.Kind.STRUCT;
_typeWireStruct.name = "v.io/core/veyron2/vom.WireStruct";
_typeWireStruct.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Fields", type: _type3}];
_typeWireUnion.kind = vom.Kind.STRUCT;
_typeWireUnion.name = "v.io/core/veyron2/vom.WireUnion";
_typeWireUnion.fields = [{name: "Name", type: vom.Types.STRING}, {name: "Fields", type: _type3}];
module.exports.DumpAtom = (vom.Registry.lookupOrCreateConstructor(_typeDumpAtom));
module.exports.DumpKind = (vom.Registry.lookupOrCreateConstructor(_typeDumpKind));
module.exports.Primitive = (vom.Registry.lookupOrCreateConstructor(_typePrimitive));
module.exports.TypeID = (vom.Registry.lookupOrCreateConstructor(_typeTypeID));
module.exports.WireArray = (vom.Registry.lookupOrCreateConstructor(_typeWireArray));
module.exports.WireEnum = (vom.Registry.lookupOrCreateConstructor(_typeWireEnum));
module.exports.WireField = (vom.Registry.lookupOrCreateConstructor(_typeWireField));
module.exports.WireList = (vom.Registry.lookupOrCreateConstructor(_typeWireList));
module.exports.WireMap = (vom.Registry.lookupOrCreateConstructor(_typeWireMap));
module.exports.WireNamed = (vom.Registry.lookupOrCreateConstructor(_typeWireNamed));
module.exports.WireOptional = (vom.Registry.lookupOrCreateConstructor(_typeWireOptional));
module.exports.WireSet = (vom.Registry.lookupOrCreateConstructor(_typeWireSet));
module.exports.WireStruct = (vom.Registry.lookupOrCreateConstructor(_typeWireStruct));
module.exports.WireUnion = (vom.Registry.lookupOrCreateConstructor(_typeWireUnion));




// Consts:

  module.exports.WireAnyID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x1])));

  module.exports.WireTypeID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x2])));

  module.exports.WireBoolID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x3])));

  module.exports.WireStringID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x4])));

  module.exports.WireByteID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x5])));

  module.exports.WireUint16ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x6])));

  module.exports.WireUint32ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x7])));

  module.exports.WireUint64ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x8])));

  module.exports.WireInt16ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x9])));

  module.exports.WireInt32ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0xa])));

  module.exports.WireInt64ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0xb])));

  module.exports.WireFloat32ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0xc])));

  module.exports.WireFloat64ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0xd])));

  module.exports.WireComplex64ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0xe])));

  module.exports.WireComplex128ID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0xf])));

  module.exports.WireNamedID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x10])));

  module.exports.WireEnumID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x11])));

  module.exports.WireArrayID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x12])));

  module.exports.WireListID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x13])));

  module.exports.WireSetID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x14])));

  module.exports.WireMapID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x15])));

  module.exports.WireStructID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x16])));

  module.exports.WireFieldID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x17])));

  module.exports.WireFieldListID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x18])));

  module.exports.WireUnionID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x19])));

  module.exports.WireOptionalID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x1d])));

  module.exports.WireByteListID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x1a])));

  module.exports.WireStringListID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x1b])));

  module.exports.WireTypeListID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x1c])));

  module.exports.WireTypeFirstUserID = new (vom.Registry.lookupOrCreateConstructor(_typeTypeID))(new vom.BigInt(1, new Uint8Array([0x41])));



// Errors:



function NotImplementedMethod(name) {
  throw new Error('Method ' + name + ' not implemented');
}


// Services:

   

   
 


