/**
 * @fileoverview Tests for Node Version
 */
'use strict';

var NodeVersion = require('../../../../src/environment/node_only/nodeversion');

describe('NodeVersion', function() {

  it('should be the same as the environment', function() {
    expect(NodeVersion).to.equal(process.version);
  });
});
