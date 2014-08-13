/**
 * @fileoverview Tests for PublicID
 */

var PublicID = require('../../../../src/security/public.js');

describe('PublicID match', function() {

  var shouldMatch = function(pattern, names) {
    var id = new PublicID(names);
    expect(id.match(pattern)).to.be.true;
  };

  var shouldNotMatch = function(pattern, names) {
    var id = new PublicID(names);
    expect(id.match(pattern)).to.be.false;
  };

  it('* should match everything', function() {
    shouldMatch('*' ['veyron/batman']);
    shouldMatch('*', ['veyron/brucewayne']);
  });

  it('exact match matches the name', function() {
    shouldMatch('veyron/batman', ['veyron/batman']);
  });

  it('exact match does not match a different name', function() {
    shouldNotMatch('veyron/batman', ['veyron/brucewayne']);
  });

  it('exact match does not match a blessee of the name', function() {
    shouldNotMatch('veyron/batman', ['veyron/batman/car']);
  });

  it('exact match matches the blessor of the name', function() {
    shouldMatch('veyron/batman', ['veyron']);
    shouldMatch('veyron/batman/car', ['veyron']);
  });

  it('wildcard match matches the name', function() {
    shouldMatch('veyron/batman/*', ['veyron/batman']);
  });

  it('wildcard match does not match a different name', function() {
    shouldNotMatch('veyron/batman/*', ['veyron/brucewayne']);
  });

  it('wildcard match matches a blessee of the name', function() {
    shouldMatch('veyron/batman/*', ['veyron/batman/car']);
  });

  it('wildcard match matches the blessor of the name', function() {
    shouldMatch('veyron/batman/*', ['veyron']);
    shouldMatch('veyron/batman/car/*', ['veyron']);
  });

  it('exact match matches if only one name matches', function() {
    shouldMatch('veyron/batman', ['veyron/batman', 'veyron/brucewayne']);
    shouldNotMatch('veyron/superman', ['veyron/batman', 'veyron/brucewayne']);
  });

  it('wildcard match matches if only one name matches', function() {
    shouldMatch('veyron/batman/*',
                ['veyron/batman/car', 'veyron/brucewayne/car']);
    shouldNotMatch('veyron/superman/*',
                   ['veyron/batman/car', 'veyron/brucewayne/car']);
  });
});
