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
  v = v || {};
  var seconds;
  if (v.seconds) {
    if (v.seconds instanceof BigInt) {
      // TODO(bprosnitz) We should always have big int once we canonicalize
      // before calling this.
      seconds = v.seconds.toNativeNumberApprox();
    } else {
      seconds = v.seconds;
    }
  } else {
    seconds = new BigInt(0, new Uint8Array());
  }
  // TODO(bprosnitz) Remove the undefined cases because they
  // shouldn't be required after canonicalized is changed to canonicalized the
  // input before passing to this function.
  var nanos = v.nanos || 0;
  var epochInMillis = seconds * 1000 +
    nanos / 1000000;

  return new Date(epochInMillis);
}

function toDateWireType(v) {
  var time = v.getTime();
  var seconds = Math.floor(time / 1000);
  var nanos = Math.floor((time - seconds * 1000) * 1000000);
  var f = new Time({ seconds: BigInt.fromNativeNumber(seconds),
                         nanos: nanos}, true);
  return f;
}
