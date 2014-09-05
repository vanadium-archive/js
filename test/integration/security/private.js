/**
 * @fileoverview Integration test for PrivateId
 */

var veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');
var caveat = require('../../../src/security/caveat');

describe('security/private.js: Test blessing', function() {
  var rt;
  before(function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;
      done();
    });
  });

  it('Should be able to bless with private id', function() {
    var newName = rt.newIdentity('alice').then(function(publicId) {
      return rt.identity.bless(publicId, 'bob', 1000, null);
    }).then(function(blessing) {
      return blessing.names[0];
    });
    return expect(newName).to.eventually.equal('test/bob');
  });


  it('Should be able to bless with private id and caveats', function() {
    var newName = rt.newIdentity('alice').then(function(publicId) {
      var caveats = [
          new caveat.MethodCaveat(['Foo', 'Bar']),
          new caveat.PeerIdentityCaveat(['veyron/batman'])];
      return rt.identity.bless(publicId, 'bob', 1000, caveats);
    }).then(function(blessing) {
      return blessing.names[0];
    });
    return expect(newName).to.eventually.equal('test/bob');
  });

  it('Should fail when passing in non-caveats', function(done) {
    rt.newIdentity('alice', function(err, publicId) {
      if (err) {
        done(err);
        return;
      }
      rt.identity.bless(publicId, 'bob', 1000, [ 5 ], function(err, blessing) {
        if (!err) {
          done('blessing should have failed');
        } else {
          done();
        }
      });
    });
  });
});
