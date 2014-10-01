/**
 * @fileoverview Integration test for a JS server that uses a dispatcher to
 * return different objects to different suffixes.
 *
 * Grunt's subtask_setupIntegrationTestEnvironment should spawn these servers
 * before running the tests. See Gruntfile's test target for details.
 *
 * Runs in both browser and NodeJS.
 *
 * Only the public "veyron" module is available for integration tests.
 * All globals (veyron, expect, testconfig) are injected by test runners.
 */

var veyron = require('../../../src/veyron');
var TestHelper = require('../../test_helper');
var Promise = require('../../../src/lib/promise');
var ServiceWrapper = require('../../../src/idl/idl').ServiceWrapper;

function Counter(string) {
  this.string = string;
}

Counter.prototype.count = function() {
  return this.string.length;
};

function Echoer(string) {
  this.string = string;
}

Echoer.prototype.echo = function() {
  return this.string;
};

function dispatcher(suffix, method) {
  if (suffix.indexOf('echo/') === 0) {
    return {
      service: new ServiceWrapper(new Echoer(suffix.substr(5))),
    };
  } else if (suffix.indexOf('count/') === 0) {
    return {
      service: new ServiceWrapper(new Counter(suffix.substr(6))),
    };
  }
  throw new Error('unknown suffix');
}

function failDispatcher(suffix, method) {
  throw new Error('bad');
}

function promiseDispatcher(suffix, method) {
  if (suffix === 'fail') {
    return Promise.reject(new Error('bad'));
  }
  return Promise.resolve({
    service: new ServiceWrapper(new Echoer(suffix))
  });
}

function asyncDispatcher(suffix, method, cb) {
  if (suffix === 'fail') {
    cb(new Error('bad'));
    return;
  }
  cb(null, { service: new ServiceWrapper(new Echoer(suffix))});
}

describe('server/dispatcher.js: count test', function() {
  var rt;

  before(function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;

      rt.serve('dispatcher', dispatcher).then(function() {
        done();
      }).catch(done);
    });
  });

  it('Should be able to echo', function() {
    var promise = rt.bindTo('dispatcher/echo/bar').then(function(client) {
      return client.echo();
    });
    return expect(promise).to.eventually.become('bar');
  });

  it('Should be able to count', function() {
    var promise = rt.bindTo('dispatcher/count/bar').then(function(client) {
      return client.count();
    });
    return expect(promise).to.eventually.become(3);
  });

  it('Should be able to differentiate between two different' +
     ' calls', function(done) {
    var promise1 = rt.bindTo('dispatcher/count/bar').then(function(client) {
      return client.count();
    });

    var promise2 = rt.bindTo('dispatcher/count/longer').then(function(client) {
      return client.count();
    });

    Promise.all([promise1, promise2]).then(function(a) {
      expect(a[0]).to.be.equal(3);
      expect(a[1]).to.be.equal(6);
      done();
    }).catch(done);
  });

  it('Should return errors for unknown', function() {
    return expect(rt.bindTo('dispatcher/bar')).to.eventually.be.rejected;
  });
});

describe('server/dispatcher.js: exceptions', function() {
  var rt;

  before(function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;

      rt.serve('dispatcher', failDispatcher).then(function() {
        done();
      }).catch(done);
    });
  });

  it('Should return errors', function() {
    return expect(rt.bindTo('dispatcher/bar')).to.eventually.be.rejected;
  });
});

describe('server/dispatcher.js: returned promise', function() {
  var rt;

  before(function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;

      rt.serve('dispatcher', promiseDispatcher).then(function() {
        done();
      }).catch(done);
    });
  });

  it('Should resolve correctly', function() {
    var result  = rt.bindTo('dispatcher/five').then(function(client) {
      return client.echo();
    });
    return expect(result).to.eventually.be.eql('five');
  });

  it('Should return errors', function() {
    return expect(rt.bindTo('dispatcher/fail')).to.eventually.be.rejected;
  });
});

describe('server/dispatcher.js: async', function() {
  var rt;

  before(function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;

      rt.serve('dispatcher', asyncDispatcher).then(function() {
        done();
      }).catch(done);
    });
  });

  it('Should resolve correctly', function() {
    var result  = rt.bindTo('dispatcher/five').then(function(client) {
      return client.echo();
    });
    return expect(result).to.eventually.be.eql('five');
  });

  it('Should return errors', function() {
    return expect(rt.bindTo('dispatcher/fail')).to.eventually.be.rejected;
  });
});
