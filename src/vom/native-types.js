var registry = require('../vdl/native-type-registry');
var vdl = require('../vdl');
var Time = require('../gen-vdl/v.io/v23/vdlroot/time').Time;

var timeType = Time.prototype._type;
registry.registerFromNativeValue(Date, toDateWireValue, timeType);
registry.registerFromWireValue(timeType, fromDateWireValue);

function fromDateWireValue(v) {
  v = v || {};
  if (v instanceof Date) {
    return v;
  }
  var seconds;
  if (v.seconds) {
    if (v.seconds instanceof vdl.BigInt) {
      // TODO(bprosnitz) We should always have big int once we canonicalize
      // before calling this.
      seconds = v.seconds.toNativeNumberApprox();
    } else {
      seconds = v.seconds;
    }
  } else {
    seconds = new vdl.BigInt(0, new Uint8Array());
  }
  // TODO(bprosnitz) Remove the undefined cases because they
  // shouldn't be required after canonicalized is changed to canonicalized the
  // input before passing to this function.
  var nanos = v.nanos || 0;
  var epochInMillis = seconds * 1000 +
    nanos / 1000000;

  var out = new Date(epochInMillis);
  return out;
}

function toDateWireValue(v) {
  var time = v.getTime();
  var seconds = Math.floor(time / 1000);
  var nanos = Math.floor((time - seconds * 1000) * 1000000);
  var f = new Time({ seconds: vdl.BigInt.fromNativeNumber(seconds),
                         nanos: nanos}, true);
  return f;
}
