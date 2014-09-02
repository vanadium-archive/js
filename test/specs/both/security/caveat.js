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


  it('Should serialize PeerIdentityCaveat', function() {
    var serialized = JSON.parse(JSON.stringify(
        new caveats.PeerIdentityCaveat(
            ['veyron/batman', 'veyron/brucewayne'])));
    expect(serialized).to.be.deep.equal({
      _type: 'PeerIdentityCaveat',
      data: ['veyron/batman', 'veyron/brucewayne']
    });
  });
});
