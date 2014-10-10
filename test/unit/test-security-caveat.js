var test = require('prova');
var caveat = require('../../src/security/caveat.js');
var MethodCaveat = caveat.MethodCaveat;

test('var caveat = new MethodCaveat(methods)', function(assert) {
  var methods = [ 'Enter', 'Leave' ];
  var caveat = new MethodCaveat(methods);
  var string = JSON.stringify(caveat);
  var json = JSON.parse(string);

  assert.deepEqual(json, {
    _type: 'MethodCaveat',
    data: methods
  });

  assert.end();
});
