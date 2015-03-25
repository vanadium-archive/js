// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

var test = require('prova');
var isPublicMethod = require('../../src/lib/service-reflection').isPublicMethod;

function AConstructor() {
  this._privateMethod1 = function(){};
  this.exposedMethod1 = function(){};
  this[''] = 8;
  this.exposedField1 = 9;
}

AConstructor.prototype._privateMethod2 = function(){};
AConstructor.prototype.exposedMethod2 = function(){};
AConstructor.prototype.exposedField2 = 10;

test('isPublicMethod(key, service)', function(t) {
  var service = new AConstructor();

  t.equal(isPublicMethod('exposedMethod1', service), true);
  t.equal(isPublicMethod('exposedMethod2', service), true);
  t.equal(isPublicMethod('_privateMethod1', service), false);
  t.equal(isPublicMethod('', service), false);
  t.equal(isPublicMethod('exposedField1', service), false);
  t.equal(isPublicMethod('exposedField2', service), false);
  t.end();
});
