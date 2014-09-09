/**
 * @fileoverview Tests for caveats
 */

var caveats = require('../../../../src/security/caveat.js');

describe('Caveats to JSON', function() {
  it('Should serialize MethodCaveat', function() {
    var serialized = JSON.parse(JSON.stringify(
        new caveats.MethodCaveat(['Enter', 'Leave'])));
    expect(serialized).to.be.deep.equal({
      _type: 'MethodCaveat',
      data: ['Enter', 'Leave']
    });
  });


  it('Should serialize PeerBlessingsCaveat', function() {
    var serialized = JSON.parse(JSON.stringify(
        new caveats.PeerBlessingsCaveat(
            ['veyron/batman', 'veyron/brucewayne'])));
    expect(serialized).to.be.deep.equal({
      _type: 'PeerBlessingsCaveat',
      data: ['veyron/batman', 'veyron/brucewayne']
    });
  });
});
