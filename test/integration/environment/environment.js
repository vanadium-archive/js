/**
 * @fileoverview Integration test for getEnvironment() that
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect) are injected by test runners.
 */
describe('Environment', function() {

  var veyron = new Veyron();
  var environment = veyron.getEnvironment();

  it('should have a supportsWebSockets property', function() {
    expect(environment.supportsWebSockets).to.exist;
  });

  it('should have a non-empty description property', function() {
    expect(environment.description).to.exist;
    expect(environment.description).not.to.be.empty;
  });

});
