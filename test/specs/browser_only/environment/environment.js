/**
 * @fileoverview Tests for Environment detection
 */
'use strict';

var Environment = require('../../../../src/environment/environment');

describe('Environment', function() {

  it('should support WebSockets if the test runner supports WebSockets',
      function() {

        var testRunnerSupportsWebSockets =
            (typeof window.WebSocket !== 'undefined');

        expect(Environment.supportsWebSockets).to.equal(
            testRunnerSupportsWebSockets
        );
      }
  );

  it('should have the browser UA in the description', function() {

    var testRunnerUA = navigator.userAgent;

    expect(Environment.description).to.contain(testRunnerUA);
  });
});
