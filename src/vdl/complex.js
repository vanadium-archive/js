// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A type for complex numbers
 * @private
 */

module.exports = Complex;

/**
 * Represents a complex number
 * @constructor
 * @memberof module:vanadium.vdl
 * @param {number} real The real part of the number
 * @param {number} imag The imaginary part the number
 */
function Complex(real, imag) {
  this.real = real || 0;
  this.imag = imag || 0;
}

/**
 * @returns string The string format of the number
 */
Complex.prototype.toString = function() {
  if (this.imag === 0) {
    return this.real + '';
  }
  if (this.real === 0) {
    return this.imag + 'i';
  }
  var sign = this.imag < 0 ? '-' : '+';
  var imag = Math.abs(this.imag);
  if (imag === 1) {
    imag = '';
  }
  return this.real + ' ' + sign + ' ' + imag + 'i';
};

/**
 * Adds c to this
 * @param {module:vanadium.vdl.Complex} c The number to add
 * @returns {module:vanadium.vdl.Complex} this + c
 */
Complex.prototype.add = function(c){
  return new Complex(this.real + c.real,
                     this.imag + c.imag);

};

/**
 * Subtracts c from this
 * @param {module:vanadium.vdl.Complex} c The number to subtract
 * @returns {module:vanadium.vdl.Complex} this - c
 */
Complex.prototype.subtract = function(c) {
  return new Complex(this.real - c.real,
                     this.imag - c.imag);
};

/**
 * Multiply c with this
 * @param {module:vanadium.vdl.Complex} c The number to multiply by
 * @returns {module:vanadium.vdl.Complex} this * c
 */
Complex.prototype.multiply = function(c) {
  var real = this.real * c.real -
    this.imag * c.imag;
  var imag = this.real * c.imag +
    c.real * this.imag;
  return new Complex(real, imag);
};

/**
 * Divde this by c
 * @param {module:vanadium.vdl.Complex} c The number to divide by
 * @returns {module:vanadium.vdl.Complex} this / c
 */
Complex.prototype.divide = function(c) {
  var num = this.multiply(new Complex(c.real, -c.imag));
  var denom = c.real * c.real + c.imag * c.imag;
  num.real = num.real / denom;
  num.imag = num.imag / denom;
  return num;
};
