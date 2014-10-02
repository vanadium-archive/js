var test = require('prova');
var caveat = require('../../src/security/caveat.js');
var MethodCaveat = caveat.MethodCaveat;
var PeerBlessingsCaveat = caveat.PeerBlessingsCaveat;

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

test('var caveat = new PeerBlessingsCaveat(patterns)', function(assert) {
  var patterns = [ 'veyron/batman', 'veyron/brucewayne' ];
  var caveat = new PeerBlessingsCaveat(patterns);
  var string = JSON.stringify(caveat);
  var json = JSON.parse(string);

  assert.deepEqual(json, {
    _type: 'PeerBlessingsCaveat',
    data: patterns
  });

  assert.end();
});
