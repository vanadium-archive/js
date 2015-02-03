// This file was auto-generated by the veyron vdl tool.
var vom = require('.././../../../../../../vom/vom');





module.exports = {};



// Types:
var _typeDuration = new vom.Type();
var _typeTime = new vom.Type();
_typeDuration.kind = vom.Kind.STRUCT;
_typeDuration.name = "time.Duration";
_typeDuration.fields = [{name: "Seconds", type: vom.Types.INT64}, {name: "Nano", type: vom.Types.INT32}];
_typeTime.kind = vom.Kind.STRUCT;
_typeTime.name = "time.Time";
_typeTime.fields = [{name: "Seconds", type: vom.Types.INT64}, {name: "Nano", type: vom.Types.INT32}];
module.exports.Duration = (vom.Registry.lookupOrCreateConstructor(_typeDuration));
module.exports.Time = (vom.Registry.lookupOrCreateConstructor(_typeTime));




// Consts:



// Errors:



function NotImplementedMethod(name) {
  throw new Error('Method ' + name + ' not implemented');
}


// Services:

   
 


