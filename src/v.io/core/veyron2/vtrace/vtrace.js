// This file was auto-generated by the veyron vdl tool.
var vdl = require('../../../.././vdl/vdl');





var time = require('./../vdl/vdlroot/src/time/time');
var uniqueid = require('./../uniqueid/uniqueid');

module.exports = {};



// Types:
var _type1 = new vdl.Type();
var _type2 = new vdl.Type();
var _typeAnnotation = new vdl.Type();
var _typeRequest = new vdl.Type();
var _typeResponse = new vdl.Type();
var _typeSpanRecord = new vdl.Type();
var _typeTraceFlags = new vdl.Type();
var _typeTraceRecord = new vdl.Type();
_type1.kind = vdl.Kind.LIST;
_type1.name = "";
_type1.elem = _typeSpanRecord;
_type2.kind = vdl.Kind.LIST;
_type2.name = "";
_type2.elem = _typeAnnotation;
_typeAnnotation.kind = vdl.Kind.STRUCT;
_typeAnnotation.name = "v.io/core/veyron2/vtrace.Annotation";
_typeAnnotation.fields = [{name: "When", type: new time.Time()._type}, {name: "Message", type: vdl.Types.STRING}];
_typeRequest.kind = vdl.Kind.STRUCT;
_typeRequest.name = "v.io/core/veyron2/vtrace.Request";
_typeRequest.fields = [{name: "SpanID", type: new uniqueid.Id()._type}, {name: "TraceID", type: new uniqueid.Id()._type}, {name: "Flags", type: _typeTraceFlags}];
_typeResponse.kind = vdl.Kind.STRUCT;
_typeResponse.name = "v.io/core/veyron2/vtrace.Response";
_typeResponse.fields = [{name: "Flags", type: _typeTraceFlags}, {name: "Trace", type: _typeTraceRecord}];
_typeSpanRecord.kind = vdl.Kind.STRUCT;
_typeSpanRecord.name = "v.io/core/veyron2/vtrace.SpanRecord";
_typeSpanRecord.fields = [{name: "ID", type: new uniqueid.Id()._type}, {name: "Parent", type: new uniqueid.Id()._type}, {name: "Name", type: vdl.Types.STRING}, {name: "Start", type: new time.Time()._type}, {name: "End", type: new time.Time()._type}, {name: "Annotations", type: _type2}];
_typeTraceFlags.kind = vdl.Kind.INT32;
_typeTraceFlags.name = "v.io/core/veyron2/vtrace.TraceFlags";
_typeTraceRecord.kind = vdl.Kind.STRUCT;
_typeTraceRecord.name = "v.io/core/veyron2/vtrace.TraceRecord";
_typeTraceRecord.fields = [{name: "ID", type: new uniqueid.Id()._type}, {name: "Spans", type: _type1}];
module.exports.Annotation = (vdl.Registry.lookupOrCreateConstructor(_typeAnnotation));
module.exports.Request = (vdl.Registry.lookupOrCreateConstructor(_typeRequest));
module.exports.Response = (vdl.Registry.lookupOrCreateConstructor(_typeResponse));
module.exports.SpanRecord = (vdl.Registry.lookupOrCreateConstructor(_typeSpanRecord));
module.exports.TraceFlags = (vdl.Registry.lookupOrCreateConstructor(_typeTraceFlags));
module.exports.TraceRecord = (vdl.Registry.lookupOrCreateConstructor(_typeTraceRecord));




// Consts:

  module.exports.Empty = new (vdl.Registry.lookupOrCreateConstructor(_typeTraceFlags))(0);

  module.exports.CollectInMemory = new (vdl.Registry.lookupOrCreateConstructor(_typeTraceFlags))(1);



// Errors:



// Services:

   
 


