// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var Kind = require('./kind.js');

module.exports = {
  getMax: getMax,
  getMin: getMin
};

function getMax(kind) {
  switch(kind) {
    case Kind.BYTE:
      return 0xff;
    case Kind.UINT16:
      return 0xffff;
    case Kind.UINT32:
      return 0xffffffff;
    case Kind.INT16:
      return 0x7fff;
    case Kind.INT32:
      return 0x7fffffff;
    case Kind.FLOAT32:
    case Kind.COMPLEX64:
      return 3.40282346638528859811704183484516925440e+38;
    case Kind.FLOAT64:
    case Kind.COMPLEX128:
      return Number.MAX_VALUE;
  }
}

function getMin(kind) {
  switch(kind) {
    case Kind.BYTE:
      return 0;
    case Kind.UINT16:
      return 0;
    case Kind.UINT32:
      return 0;
    case Kind.INT16:
      return -0x8000;
    case Kind.INT32:
      return -0x80000000;
    case Kind.FLOAT32:
    case Kind.COMPLEX64:
      return -3.40282346638528859811704183484516925440e+38;
    case Kind.FLOAT64:
    case Kind.COMPLEX128:
      return -Number.MAX_VALUE;
  }
}