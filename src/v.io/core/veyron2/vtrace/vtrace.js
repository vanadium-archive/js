// This file was auto-generated by the veyron vdl tool.
var vom = require('../../../.././vom/vom');




var uniqueid = require('./../uniqueid/uniqueid');

module.exports = {};



// Types:
var _type1 = new vom.Type();
var _type2 = new vom.Type();
var _typeAnnotation = new vom.Type();
var _typeRequest = new vom.Type();
var _typeResponse = new vom.Type();
var _typeSpanRecord = new vom.Type();
var _typeTraceMethod = new vom.Type();
var _typeTraceRecord = new vom.Type();
_type1.kind = vom.Kind.LIST;
_type1.name = "";
_type1.elem = _typeSpanRecord;
_type2.kind = vom.Kind.LIST;
_type2.name = "";
_type2.elem = _typeAnnotation;
_typeAnnotation.kind = vom.Kind.STRUCT;
_typeAnnotation.name = "v.io/core/veyron2/vtrace.Annotation";
_typeAnnotation.fields = [{name: "When", type: vom.Types.INT64}, {name: "Message", type: vom.Types.STRING}];
_typeRequest.kind = vom.Kind.STRUCT;
_typeRequest.name = "v.io/core/veyron2/vtrace.Request";
_typeRequest.fields = [{name: "SpanID", type: new uniqueid.ID()._type}, {name: "TraceID", type: new uniqueid.ID()._type}, {name: "Method", type: _typeTraceMethod}];
_typeResponse.kind = vom.Kind.STRUCT;
_typeResponse.name = "v.io/core/veyron2/vtrace.Response";
_typeResponse.fields = [{name: "Method", type: _typeTraceMethod}, {name: "Trace", type: _typeTraceRecord}];
_typeSpanRecord.kind = vom.Kind.STRUCT;
_typeSpanRecord.name = "v.io/core/veyron2/vtrace.SpanRecord";
_typeSpanRecord.fields = [{name: "ID", type: new uniqueid.ID()._type}, {name: "Parent", type: new uniqueid.ID()._type}, {name: "Name", type: vom.Types.STRING}, {name: "Start", type: vom.Types.INT64}, {name: "End", type: vom.Types.INT64}, {name: "Annotations", type: _type2}];
_typeTraceMethod.kind = vom.Kind.INT32;
_typeTraceMethod.name = "v.io/core/veyron2/vtrace.TraceMethod";
_typeTraceRecord.kind = vom.Kind.STRUCT;
_typeTraceRecord.name = "v.io/core/veyron2/vtrace.TraceRecord";
_typeTraceRecord.fields = [{name: "ID", type: new uniqueid.ID()._type}, {name: "Spans", type: _type1}];
module.exports.Annotation = (vom.Registry.lookupOrCreateConstructor(_typeAnnotation));
module.exports.Request = (vom.Registry.lookupOrCreateConstructor(_typeRequest));
module.exports.Response = (vom.Registry.lookupOrCreateConstructor(_typeResponse));
module.exports.SpanRecord = (vom.Registry.lookupOrCreateConstructor(_typeSpanRecord));
module.exports.TraceMethod = (vom.Registry.lookupOrCreateConstructor(_typeTraceMethod));
module.exports.TraceRecord = (vom.Registry.lookupOrCreateConstructor(_typeTraceRecord));




// Consts:

  module.exports.None = new (vom.Registry.lookupOrCreateConstructor(_typeTraceMethod))(0);

  module.exports.InMemory = new (vom.Registry.lookupOrCreateConstructor(_typeTraceMethod))(1);



// Errors:



function NotImplementedMethod(name) {
  throw new Error('Method ' + name + ' not implemented');
}


// Services:

   
 


