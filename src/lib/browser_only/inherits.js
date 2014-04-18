/**
 *  @fileoverview Inherit implementation for the Browser
 */

'use strict';

var inherits = function(sub, sup) {
  sub.super_ = sup; // add super_ like NodeJS does
  sub.prototype = Object.create(sup.prototype);
  sub.prototype.constructor = sup;
};

module.exports = inherits;

