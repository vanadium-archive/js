var registry = require('./native-type-registry');
var Types = require('./types');
var errorConversion = require('./error-conversion');
var Time = require('../v.io/v23/vdlroot/time').Time;
var BigInt = require('./big-int');

var timeType = Time.prototype._type;
// VanadiumErrors already have the right type description.  We registered Error
// in case anyone tries to pass a non-vanadium error as an argument to a
// function.
registry.registerFromNativeType(Error, errorConversion.fromNativeType);
// We register both the optional and the concrete type for the error depending
// on what gets sent on the wire.
registry.registerFromWireType(Types.ERROR, errorConversion.fromWireType);
registry.registerFromWireType(Types.ERROR.elem, errorConversion.fromWireType);
registry.registerFromNativeType(Date, toDateWireType);
registry.registerFromWireType(timeType, fromDateWireType);

function fromDateWireType(v) {
  if (v === undefined || v === null) {
    return v;
  }
  var seconds = v.seconds;
  if (seconds instanceof BigInt) {
    seconds = seconds.toNativeNumberApprox();
  }
  var epochInMillis = seconds * 1000 +
    v.nano / 1000000;

  return new Date(epochInMillis);
}

function toDateWireType(v) {
  var time = v.getTime();
  var seconds = Math.floor(time / 1000);
  var nanos = Math.floor((time - seconds * 1000) * 1000000);
  var f = new Time({ seconds: BigInt.fromNativeNumber(seconds),
                         nano: nanos}, true);
  return f;
}
