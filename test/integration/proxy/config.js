/**
 * @fileoverview Integration test for getting the initial WSPR config.
 */
describe('proxy/config.js:', function() {
  var client;
  beforeEach(function() {
    var veyron = new Veyron(TestHelper.veyronConfig);
    client = veyron.newClient();
  });

  it('Should get WSPR config', function(done) {
    // TODO(bprosnitz) Change this to use an exposed interface for the
    // proxy connection after the config is exposed.
    client._proxyConnection.getWebSocket(); // Initialize the websocket.
    client._proxyConnection.config.then(function(config) {
      expect(config).to.include.keys('mounttableRoot');
      expect(config.mounttableRoot).to.not.be.empty;
      done();
    }).catch(done);
  });
});
