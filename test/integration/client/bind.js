/**
 * @fileoverview Integration test for binding through WSPR.
 *
 * This is not tested in the client beforeEach test sections, so this
 * is useful for identifying when binding is the cause of the
 * beforeEach failures.
 */

var veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');

describe('client/bind.js:', function() {
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

  it('Should be able to bind', function(done) {
    var absoluteVeyronName =
        '/' + testconfig['SAMPLE_VEYRON_GO_SERVICE_ENDPOINT'] + '/cache';
    rt.bindTo(absoluteVeyronName).then(function() {
      done();
    }).catch(done);
  });
});
