/**
 * @fileoverview Tests for Environment detection
 */
'use strict';

var Environment = require('../../../../src/environment/environment');

describe('Environment', function() {

  it('should support WebSockets', function() {
    expect(Environment.supportsWebSockets).to.be.true;
  });

  it('should have NodeJS version in the description', function() {
    expect(Environment.description).to.contain('NodeJS');
    expect(Environment.description).to.contain(process.version);
  });
});
