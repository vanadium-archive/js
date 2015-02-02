/**
 * @fileoverview A type for complex numbers
 */

var Kind = require('./kind');

module.exports = Complex;

function Complex(real, imag) {
  this.real = real || 0;
  this.imag = imag || 0;
}

Complex.prototype._type = Kind.COMPLEX128;
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

Complex.prototype.add = function(c){
  return new Complex(this.real + c.real,
                     this.imag + c.imag);

};

Complex.prototype.subtract = function(c) {
  return new Complex(this.real - c.real,
                     this.imag - c.imag);
};

Complex.prototype.multiply = function(c) {
  var real = this.real * c.real -
    this.imag * c.imag;
  var imag = this.real * c.imag +
    c.real * this.imag;
  return new Complex(real, imag);
};

Complex.prototype.divide = function(c) {
  var num = this.multiply(new Complex(c.real, -c.imag));
  var denom = c.real * c.real + c.imag * c.imag;
  num.real = num.real / denom;
  num.imag = num.imag / denom;
  return num;
};
