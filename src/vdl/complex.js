// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

/**
 * @fileoverview A type for complex numbers.
 * @private
 */

module.exports = Complex;

/**
 * @summary Represents a complex number.
 * @constructor
 * @memberof module:vanadium.vdl
 * @param {number} real The real part of the number.
 * @param {number} imag The imaginary part of the number.
 */
function Complex(real, imag) {
  this.real = real || 0;
  this.imag = imag || 0;
}

/**
 * @returns {string} The string format of this complex number.
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
 * Adds a complex number to this complex number.
 * @param {module:vanadium.vdl.Complex} c The complex number to add to this
 * complex number.
 * @returns {module:vanadium.vdl.Complex} This complex number plus the argument
 * complex number.
 */
Complex.prototype.add = function(c){
  return new Complex(this.real + c.real,
                     this.imag + c.imag);

};

/**
 * Subtracts a complex number from this number.
 * @param {module:vanadium.vdl.Complex} c The complex number to subtract from
 * this complex number.
 * @returns {module:vanadium.vdl.Complex} This complex number minus the
 * argument complex number.
 */
Complex.prototype.subtract = function(c) {
  return new Complex(this.real - c.real,
                     this.imag - c.imag);
};

/**
 * Multiply a complex number with this number.
 * @param {module:vanadium.vdl.Complex} c The compler number to multiply this
 * complex number with.
 * @returns {module:vanadium.vdl.Complex} This complex number times the
 * argument complex number.
 */
Complex.prototype.multiply = function(c) {
  var real = this.real * c.real -
    this.imag * c.imag;
  var imag = this.real * c.imag +
    c.real * this.imag;
  return new Complex(real, imag);
};

/**
 * Divide this complex number by another complex number.
 * @param {module:vanadium.vdl.Complex} c The complex number to divide this
 * complex number by.
 * @returns {module:vanadium.vdl.Complex} This complex number divided by the
 * argument complex number.
 */
Complex.prototype.divide = function(c) {
  var num = this.multiply(new Complex(c.real, -c.imag));
  var denom = c.real * c.real + c.imag * c.imag;
  num.real = num.real / denom;
  num.imag = num.imag / denom;
  return num;
};
