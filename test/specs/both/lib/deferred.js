/**
 * @fileoverview Tests for IDL parsing.
 */
'use strict';

var Deferred = require('../../../../src/lib/deferred.js');

describe('Deferred\'s Promise', function() {

  var deferred;
  beforeEach(function() {
    deferred = new Deferred();
  });

  it('Should not fail or succeed if deferred is not triggered', function(done) {
    var promise = deferred.promise;

    setTimeout(function() {
      done();
    }, 30);

    promise.then(function(result) {
      done('Promise Succeeded but should not have.');
    }, function(err) {
      done('Promise Failed but should not have.');
    });

  });

  it('Should succeed when deferred is resolved', function() {
    var promise = deferred.promise;

    setTimeout(function() {
      deferred.resolve('foo');
    }, 30);

    return expect(promise).to.eventually.equal('foo');

  });

  it('Should fail when deferred is rejected', function() {
    var promise = deferred.promise;

    setTimeout(function() {
      deferred.reject('error');
    }, 30);

    return expect(promise).to.be.rejectedWith('error');

  });

});
