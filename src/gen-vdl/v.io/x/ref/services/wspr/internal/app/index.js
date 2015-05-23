// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file was auto-generated by the vanadium vdl tool.
var vdl = require('../../../../../../../../vdl');





var signature = require('./../../../../../../v23/vdlroot/signature');
var time = require('./../../../../../../v23/vdlroot/time');
var security = require('./../../../../../../v23/security');
var vtrace = require('./../../../../../../v23/vtrace');
var principal = require('./../principal');
var server = require('./../rpc/server');

module.exports = {};



// Types:
var _type1 = new vdl.Type();
var _type10 = new vdl.Type();
var _type2 = new vdl.Type();
var _type3 = new vdl.Type();
var _type4 = new vdl.Type();
var _type5 = new vdl.Type();
var _type6 = new vdl.Type();
var _type7 = new vdl.Type();
var _type8 = new vdl.Type();
var _type9 = new vdl.Type();
var _typeGranterHandle = new vdl.Type();
var _typeGranterRequest = new vdl.Type();
var _typeGranterResponse = new vdl.Type();
var _typeRpcCallOption = new vdl.Type();
var _typeRpcRequest = new vdl.Type();
var _typeRpcResponse = new vdl.Type();
var _typeRpcServerOption = new vdl.Type();
_type1.kind = vdl.kind.LIST;
_type1.name = "";
_type1.elem = _typeRpcCallOption;
_type10.kind = vdl.kind.LIST;
_type10.name = "";
_type10.elem = new principal.BlessingsHandle()._type;
_type2.kind = vdl.kind.LIST;
_type2.name = "";
_type2.elem = new security.BlessingPattern()._type;
_type3.kind = vdl.kind.LIST;
_type3.name = "";
_type3.elem = vdl.types.ANY;
_type4.kind = vdl.kind.LIST;
_type4.name = "";
_type4.elem = _typeRpcServerOption;
_type5.kind = vdl.kind.LIST;
_type5.name = "";
_type5.elem = new security.Caveat()._type;
_type6.kind = vdl.kind.OPTIONAL;
_type6.name = "";
_type6.elem = new principal.JsBlessings()._type;
_type7.kind = vdl.kind.LIST;
_type7.name = "";
_type7.elem = vdl.types.STRING;
_type8.kind = vdl.kind.MAP;
_type8.name = "";
_type8.elem = _type6;
_type8.key = new security.BlessingPattern()._type;
_type9.kind = vdl.kind.LIST;
_type9.name = "";
_type9.elem = new signature.Interface()._type;
_typeGranterHandle.kind = vdl.kind.INT32;
_typeGranterHandle.name = "v.io/x/ref/services/wspr/internal/app.GranterHandle";
_typeGranterRequest.kind = vdl.kind.STRUCT;
_typeGranterRequest.name = "v.io/x/ref/services/wspr/internal/app.GranterRequest";
_typeGranterRequest.fields = [{name: "GranterHandle", type: _typeGranterHandle}, {name: "Call", type: new server.SecurityCall()._type}];
_typeGranterResponse.kind = vdl.kind.STRUCT;
_typeGranterResponse.name = "v.io/x/ref/services/wspr/internal/app.GranterResponse";
_typeGranterResponse.fields = [{name: "Blessings", type: new principal.BlessingsHandle()._type}, {name: "Err", type: vdl.types.ERROR}];
_typeRpcCallOption.kind = vdl.kind.UNION;
_typeRpcCallOption.name = "v.io/x/ref/services/wspr/internal/app.RpcCallOption";
_typeRpcCallOption.fields = [{name: "AllowedServersPolicy", type: _type2}, {name: "RetryTimeout", type: new time.Duration()._type}, {name: "Granter", type: _typeGranterHandle}];
_typeRpcRequest.kind = vdl.kind.STRUCT;
_typeRpcRequest.name = "v.io/x/ref/services/wspr/internal/app.RpcRequest";
_typeRpcRequest.fields = [{name: "Name", type: vdl.types.STRING}, {name: "Method", type: vdl.types.STRING}, {name: "NumInArgs", type: vdl.types.INT32}, {name: "NumOutArgs", type: vdl.types.INT32}, {name: "IsStreaming", type: vdl.types.BOOL}, {name: "Deadline", type: new time.WireDeadline()._type}, {name: "TraceRequest", type: new vtrace.Request()._type}, {name: "Context", type: new server.Context()._type}, {name: "CallOptions", type: _type1}];
_typeRpcResponse.kind = vdl.kind.STRUCT;
_typeRpcResponse.name = "v.io/x/ref/services/wspr/internal/app.RpcResponse";
_typeRpcResponse.fields = [{name: "OutArgs", type: _type3}, {name: "TraceResponse", type: new vtrace.Response()._type}];
_typeRpcServerOption.kind = vdl.kind.UNION;
_typeRpcServerOption.name = "v.io/x/ref/services/wspr/internal/app.RpcServerOption";
_typeRpcServerOption.fields = [{name: "IsLeaf", type: vdl.types.BOOL}, {name: "ServesMountTable", type: vdl.types.BOOL}];
_type1.freeze();
_type10.freeze();
_type2.freeze();
_type3.freeze();
_type4.freeze();
_type5.freeze();
_type6.freeze();
_type7.freeze();
_type8.freeze();
_type9.freeze();
_typeGranterHandle.freeze();
_typeGranterRequest.freeze();
_typeGranterResponse.freeze();
_typeRpcCallOption.freeze();
_typeRpcRequest.freeze();
_typeRpcResponse.freeze();
_typeRpcServerOption.freeze();
module.exports.GranterHandle = (vdl.registry.lookupOrCreateConstructor(_typeGranterHandle));
module.exports.GranterRequest = (vdl.registry.lookupOrCreateConstructor(_typeGranterRequest));
module.exports.GranterResponse = (vdl.registry.lookupOrCreateConstructor(_typeGranterResponse));
module.exports.RpcCallOption = (vdl.registry.lookupOrCreateConstructor(_typeRpcCallOption));
module.exports.RpcRequest = (vdl.registry.lookupOrCreateConstructor(_typeRpcRequest));
module.exports.RpcResponse = (vdl.registry.lookupOrCreateConstructor(_typeRpcResponse));
module.exports.RpcServerOption = (vdl.registry.lookupOrCreateConstructor(_typeRpcServerOption));




// Consts:



// Errors:



// Services:

   

  
    
function Controller(){}
module.exports.Controller = Controller;

    
      
Controller.prototype.serve = function(ctx, serverCall, name, serverId, serverOpts) {
  throw new Error('Method Serve not implemented');
};
    
      
Controller.prototype.stop = function(ctx, serverCall, serverId) {
  throw new Error('Method Stop not implemented');
};
    
      
Controller.prototype.addName = function(ctx, serverCall, serverId, name) {
  throw new Error('Method AddName not implemented');
};
    
      
Controller.prototype.removeName = function(ctx, serverCall, serverId, name) {
  throw new Error('Method RemoveName not implemented');
};
    
      
Controller.prototype.unlinkBlessings = function(ctx, serverCall, handle) {
  throw new Error('Method UnlinkBlessings not implemented');
};
    
      
Controller.prototype.blessingsDebugString = function(ctx, serverCall, handle) {
  throw new Error('Method BlessingsDebugString not implemented');
};
    
      
Controller.prototype.bless = function(ctx, serverCall, publicKey, handle, extension, caveat) {
  throw new Error('Method Bless not implemented');
};
    
      
Controller.prototype.blessSelf = function(ctx, serverCall, name, caveats) {
  throw new Error('Method BlessSelf not implemented');
};
    
      
Controller.prototype.addToRoots = function(ctx, serverCall, handle) {
  throw new Error('Method AddToRoots not implemented');
};
    
      
Controller.prototype.blessingStoreSet = function(ctx, serverCall, blessingsHandle, pattern) {
  throw new Error('Method BlessingStoreSet not implemented');
};
    
      
Controller.prototype.blessingStoreForPeer = function(ctx, serverCall, peerBlessings) {
  throw new Error('Method BlessingStoreForPeer not implemented');
};
    
      
Controller.prototype.blessingStoreSetDefault = function(ctx, serverCall, blessingsHandle) {
  throw new Error('Method BlessingStoreSetDefault not implemented');
};
    
      
Controller.prototype.blessingStoreDefault = function(ctx, serverCall) {
  throw new Error('Method BlessingStoreDefault not implemented');
};
    
      
Controller.prototype.blessingStorePublicKey = function(ctx, serverCall) {
  throw new Error('Method BlessingStorePublicKey not implemented');
};
    
      
Controller.prototype.blessingStorePeerBlessings = function(ctx, serverCall) {
  throw new Error('Method BlessingStorePeerBlessings not implemented');
};
    
      
Controller.prototype.blessingStoreDebugString = function(ctx, serverCall) {
  throw new Error('Method BlessingStoreDebugString not implemented');
};
    
      
Controller.prototype.remoteBlessings = function(ctx, serverCall, name, method) {
  throw new Error('Method RemoteBlessings not implemented');
};
    
      
Controller.prototype.signature = function(ctx, serverCall, name) {
  throw new Error('Method Signature not implemented');
};
    
      
Controller.prototype.unionOfBlessings = function(ctx, serverCall, toJoin) {
  throw new Error('Method UnionOfBlessings not implemented');
};
     

    
Controller.prototype._serviceDescription = {
  name: 'Controller',
  pkgPath: 'v.io/x/ref/services/wspr/internal/app',
  doc: "",
  embeds: [],
  methods: [
    
      
    {
    name: 'Serve',
    doc: "// Serve instructs WSPR to start listening for calls on behalf\n// of a javascript server.",
    inArgs: [{
      name: 'name',
      doc: "",
      type: vdl.types.STRING
    },
    {
      name: 'serverId',
      doc: "",
      type: vdl.types.UINT32
    },
    {
      name: 'serverOpts',
      doc: "",
      type: _type4
    },
    ],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'Stop',
    doc: "// Stop instructs WSPR to stop listening for calls for the\n// given javascript server.",
    inArgs: [{
      name: 'serverId',
      doc: "",
      type: vdl.types.UINT32
    },
    ],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'AddName',
    doc: "// AddName adds a published name to an existing server.",
    inArgs: [{
      name: 'serverId',
      doc: "",
      type: vdl.types.UINT32
    },
    {
      name: 'name',
      doc: "",
      type: vdl.types.STRING
    },
    ],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'RemoveName',
    doc: "// RemoveName removes a published name from an existing server.",
    inArgs: [{
      name: 'serverId',
      doc: "",
      type: vdl.types.UINT32
    },
    {
      name: 'name',
      doc: "",
      type: vdl.types.STRING
    },
    ],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'UnlinkBlessings',
    doc: "// UnlinkBlessings removes the given blessings from the blessings store.",
    inArgs: [{
      name: 'handle',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    ],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingsDebugString',
    doc: "// BlessingsDebugString gets a string useful for debugging blessings.",
    inArgs: [{
      name: 'handle',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    ],
    outArgs: [{
      name: '',
      doc: "",
      type: vdl.types.STRING
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'Bless',
    doc: "// Bless binds extensions of blessings held by this principal to\n// another principal (represented by its public key).",
    inArgs: [{
      name: 'publicKey',
      doc: "",
      type: vdl.types.STRING
    },
    {
      name: 'handle',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    {
      name: 'extension',
      doc: "",
      type: vdl.types.STRING
    },
    {
      name: 'caveat',
      doc: "",
      type: _type5
    },
    ],
    outArgs: [{
      name: 'publicKeyOut',
      doc: "",
      type: vdl.types.STRING
    },
    {
      name: 'handleOut',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessSelf',
    doc: "// BlessSelf creates a blessing with the provided name for this principal.",
    inArgs: [{
      name: 'name',
      doc: "",
      type: vdl.types.STRING
    },
    {
      name: 'caveats',
      doc: "",
      type: _type5
    },
    ],
    outArgs: [{
      name: 'publicKeyOut',
      doc: "",
      type: vdl.types.STRING
    },
    {
      name: 'handleOut',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'AddToRoots',
    doc: "// AddToRoots adds the provided blessing as a root.",
    inArgs: [{
      name: 'handle',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    ],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingStoreSet',
    doc: "// BlessingStoreSet puts the specified blessing in the blessing store under the provided pattern.",
    inArgs: [{
      name: 'blessingsHandle',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    {
      name: 'pattern',
      doc: "",
      type: new security.BlessingPattern()._type
    },
    ],
    outArgs: [{
      name: '',
      doc: "",
      type: _type6
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingStoreForPeer',
    doc: "// BlessingStoreForPeer retrieves the blessings marked for the given peers.",
    inArgs: [{
      name: 'peerBlessings',
      doc: "",
      type: _type7
    },
    ],
    outArgs: [{
      name: '',
      doc: "",
      type: _type6
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingStoreSetDefault',
    doc: "// BlessingStoreSetDefault sets the default blessings.",
    inArgs: [{
      name: 'blessingsHandle',
      doc: "",
      type: new principal.BlessingsHandle()._type
    },
    ],
    outArgs: [],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingStoreDefault',
    doc: "// BlessingStoreDefault fetches the default blessings for the principal of the controller.",
    inArgs: [],
    outArgs: [{
      name: '',
      doc: "",
      type: _type6
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingStorePublicKey',
    doc: "// BlessingStorePublicKey fetches the public key of the principal for which this store hosts blessings.",
    inArgs: [],
    outArgs: [{
      name: '',
      doc: "",
      type: vdl.types.STRING
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingStorePeerBlessings',
    doc: "// BlessingStorePeerBlessings returns all the blessings that the BlessingStore holds.",
    inArgs: [],
    outArgs: [{
      name: '',
      doc: "",
      type: _type8
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'BlessingStoreDebugString',
    doc: "// BlessingStoreDebugString retrieves a debug string describing the state of the blessing store",
    inArgs: [],
    outArgs: [{
      name: '',
      doc: "",
      type: vdl.types.STRING
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'RemoteBlessings',
    doc: "// RemoteBlessings fetches the remote blessings for a given name and method.",
    inArgs: [{
      name: 'name',
      doc: "",
      type: vdl.types.STRING
    },
    {
      name: 'method',
      doc: "",
      type: vdl.types.STRING
    },
    ],
    outArgs: [{
      name: '',
      doc: "",
      type: _type7
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'Signature',
    doc: "// Signature fetches the signature for a given name.",
    inArgs: [{
      name: 'name',
      doc: "",
      type: vdl.types.STRING
    },
    ],
    outArgs: [{
      name: '',
      doc: "",
      type: _type9
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
    
      
    {
    name: 'UnionOfBlessings',
    doc: "// UnionOfBlessings returns a Blessings object that carries the union of the provided blessings.",
    inArgs: [{
      name: 'toJoin',
      doc: "",
      type: _type10
    },
    ],
    outArgs: [{
      name: '',
      doc: "",
      type: _type6
    },
    ],
    inStream: null,
    outStream: null,
    tags: []
  },
     
  ]
};

   
 


