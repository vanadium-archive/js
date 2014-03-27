/**
 * @fileoverview Tests for Feature detection
 */
'use strict';

var Features =
    require('../../../../src/environment/browser_only/featuredetection');

describe('Features', function() {

  it('should support WebSockets if the test runner supports WebSockets',
      function() {

        var testRunnerSupportsWebSockets =
            (typeof window.WebSocket !== 'undefined');

        expect(Features.Supports.WebSockets()).
            to.equal(testRunnerSupportsWebSockets);
      }
  );
});
