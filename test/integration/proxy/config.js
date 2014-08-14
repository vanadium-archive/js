/**
 * @fileoverview Integration test for getting the initial WSPR config.
 */

var veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');

describe('proxy/config.js:', function() {
  var rt;
  beforeEach(function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;
      done();
    });
  });

  it('Should get WSPR config', function(done) {
    // TODO(bprosnitz) Change this to use an exposed interface for the
    // proxy connection after the config is exposed.
    rt._getProxyConnection().getWebSocket(); // Initialize the websocket.
    rt._getProxyConnection().config.then(function(config) {
      expect(config).to.include.keys('mounttableRoot');
      expect(config.mounttableRoot).to.not.be.empty;
      done();
    }).catch(done);
  });
});
