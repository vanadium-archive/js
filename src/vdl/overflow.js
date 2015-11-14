// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var kind = require('./kind.js');

module.exports = {
  getMax: getMax,
  getMin: getMin
};

function getMax(k) {
  switch(k) {
    case kind.BYTE:
      return 0xff;
    case kind.UINT16:
      return 0xffff;
    case kind.UINT32:
      return 0xffffffff;
    case kind.INT8:
      return 0x7f;
    case kind.INT16:
      return 0x7fff;
    case kind.INT32:
      return 0x7fffffff;
    case kind.FLOAT32:
    case kind.COMPLEX64:
      return 3.40282346638528859811704183484516925440e+38;
    case kind.FLOAT64:
    case kind.COMPLEX128:
      return Number.MAX_VALUE;
  }
}

function getMin(k) {
  switch(k) {
    case kind.BYTE:
      return 0;
    case kind.UINT16:
      return 0;
    case kind.UINT32:
      return 0;
    case kind.INT8:
      return -0x80;
    case kind.INT16:
      return -0x8000;
    case kind.INT32:
      return -0x80000000;
    case kind.FLOAT32:
    case kind.COMPLEX64:
      return -3.40282346638528859811704183484516925440e+38;
    case kind.FLOAT64:
    case kind.COMPLEX128:
      return -Number.MAX_VALUE;
  }
}
