var test = require('prova');
var ServiceReflection = require('../../src/lib/service-reflection.js');

test('getExposedMethodNames()', function(t) {
  function AConstructor() {
    this._privateMethod1 = function(){};
    this.exposedMethod1 = function(){};
    this[''] = 8;
    this.exposedField1 = 9;
  }
  AConstructor.prototype._privateMethod2 = function(){};
  AConstructor.prototype.exposedMethod2 = function(){};
  AConstructor.prototype.exposedField2 = 10;

  t.deepEqual(
    ServiceReflection.getExposedMethodNames(new AConstructor()).sort(),
    ['exposedMethod1', 'exposedMethod2'],
    'Only exposed methods are generated');

  t.end();
});