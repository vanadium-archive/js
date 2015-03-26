// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var registry = require('../vdl/native-type-registry');
var vdl = require('../vdl');
var Time = require('../gen-vdl/v.io/v23/vdlroot/time').Time;
var typeutil = require('../vdl/type-util');

var timeType = Time.prototype._type;
registry.registerFromNativeValue(Date, toDateWireValue, timeType);
registry.registerFromWireValue(timeType, fromDateWireValue);

// The javascript epoch is 1970, but in VDL it's the year 1.
var nativeEpochConversion = Math.floor(Date.parse('0001-01-01')/1000);
var epochConversion = vdl.BigInt.fromNativeNumber(nativeEpochConversion);

function fromDateWireValue(v) {
  v = v || {};
  if (v instanceof Date) {
    return v;
  }
  var seconds;
  if (v.seconds) {
    var unwrapped = typeutil.unwrap(v.seconds);
    if (unwrapped instanceof vdl.BigInt) {
      // TODO(bprosnitz) We should always have big int once we canonicalize
      // before calling this.
      seconds = unwrapped.add(epochConversion).toNativeNumberApprox();
    } else {
      seconds = unwrapped + nativeEpochConversion;
    }
  } else {
    seconds = nativeEpochConversion;
  }
  // TODO(bprosnitz) Remove the undefined cases because they
  // shouldn't be required after canonicalized is changed to canonicalized the
  // input before passing to this function.
  var nanos = typeutil.unwrap(v.nanos) || 0;
  var epochInMillis = seconds * 1000 +
    nanos / 1000000;

  var out = new Date(epochInMillis);
  return out;
}

function toDateWireValue(v) {
  if (v instanceof Date) {
    var time = v ? v.getTime() : 0;
    var jssecs = Math.floor(time / 1000);
    var nanos = (time - jssecs * 1000) * 1000000;
    var vdlsecs = vdl.BigInt.fromNativeNumber(jssecs).subtract(epochConversion);
    return new Time({seconds: vdlsecs, nanos: nanos}, true);
  }
  return v;
}
