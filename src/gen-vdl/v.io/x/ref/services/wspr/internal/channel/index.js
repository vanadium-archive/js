// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
var vdl = require('../../../../../../../../vdl');






module.exports = {};



// Types:
var _typeMessage = new vdl.Type();
var _typeRequest = new vdl.Type();
var _typeResponse = new vdl.Type();
_typeMessage.kind = vdl.kind.UNION;
_typeMessage.name = "v.io/x/ref/services/wspr/internal/channel.Message";
_typeMessage.fields = [{name: "Request", type: _typeRequest}, {name: "Response", type: _typeResponse}];
_typeRequest.kind = vdl.kind.STRUCT;
_typeRequest.name = "v.io/x/ref/services/wspr/internal/channel.Request";
_typeRequest.fields = [{name: "Type", type: vdl.types.STRING}, {name: "Seq", type: vdl.types.UINT32}, {name: "Body", type: vdl.types.ANY}];
_typeResponse.kind = vdl.kind.STRUCT;
_typeResponse.name = "v.io/x/ref/services/wspr/internal/channel.Response";
_typeResponse.fields = [{name: "ReqSeq", type: vdl.types.UINT32}, {name: "Err", type: vdl.types.STRING}, {name: "Body", type: vdl.types.ANY}];
_typeMessage.freeze();
_typeRequest.freeze();
_typeResponse.freeze();
module.exports.Message = (vdl.registry.lookupOrCreateConstructor(_typeMessage));
module.exports.Request = (vdl.registry.lookupOrCreateConstructor(_typeRequest));
module.exports.Response = (vdl.registry.lookupOrCreateConstructor(_typeResponse));




// Consts:



// Errors:



// Services:

   
 


