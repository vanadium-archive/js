/**
 * @fileoverview Integration test for a JS server and a JS client communication
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
var Deferred = require('../../../src/lib/deferred');
var Promise = require('../../../src/lib/promise');

var cacheWithPromises = {
  cacheMap: {},
  set: function(key, value) {
    this.cacheMap[key] = value;
  },
  get: function(key) {
    var def = new Deferred();
    var val = this.cacheMap[key];
    if (val === undefined) {
      def.reject('unknown key');
    } else {
      def.resolve(val);
    }
    return def.promise;
  } ,
  multiGet: function($stream) {
    var def = new Deferred();
    $stream.on('end', function() {
      def.resolve();
    });

    $stream.on('error', function(e) {
      def.reject(e);
    });
    var self = this;
    $stream.on('data', function(key) {
      if (key !== null) {
        var val = self.cacheMap[key];
        if (val === undefined) {
          def.reject('unknown key');
        }
        $stream.write(val);
      }
    });
    $stream.read();
    return def.promise;
  }
};

var cacheWithCallback = {
  cacheMap: {},
  set: function(key, value) {
    this.cacheMap[key] = value;
  },
  get: function(key, $callback) {
    var val = this.cacheMap[key];
    if (val === undefined) {
      $callback('unknown key');
    } else {
      $callback(null, val);
    }
  } ,
  multiGet: function($callback, $stream) {
    $stream.on('end', function close() {
      $callback(null);
    });
    $stream.on('error', function error(e) {
      $callback(e);
    });
    var self = this;
    $stream.on('data', function(key) {
      if (key !== null) {
        var val = self.cacheMap[key];
        if (val === undefined) {
          $callback(new Error('unknown key'));
        }
        $stream.write(val);
      }
    });
    $stream.read();
  }
};

function runJSClientServerTests(cacheDefinition, idl, serviceName) {
  var rt;
  var cacheServiceClient;
  var cacheServiceClientUsingEndpoint;

  before(function(done) {
    veyron.init(TestHelper.veyronConfig, function(err, _rt) {
      if (err) {
        return done(err);
      }
      rt = _rt;

      var optArg;
      if (idl) {
        optArg = serviceName;
        rt.addIDL(idl);
      } else {
        optArg = {
          set:{
            numReturnArgs: 0
          }
        };
      }

      rt.serve('myCache/Cache', cacheDefinition, optArg).then(
          function(endpoint) {
        expect(endpoint).to.exist;
        expect(endpoint).to.be.a('string');
        expect(endpoint).to.have.string('@2@tcp@127.0.0.1');

        var cacheServiceClientPromise = rt.bindTo('myCache/Cache');

        var cacheServiceClientUsingEndpointPromise = rt.bindTo(
            '/' + endpoint + '/Cache');

        Promise.all([cacheServiceClientPromise,
            cacheServiceClientUsingEndpointPromise]).then(function(results) {
          cacheServiceClient = results[0];
          cacheServiceClientUsingEndpoint = results[1];
          done();
        }).catch (done);
      }).catch(done);
    });
  });

  it('Should be able to invoke methods after the service is serveed ' +
     'using serveed name', function() {
        var result = cacheServiceClient.set('foo', 'bar').then(function() {
          return cacheServiceClient.get('foo');
        });

        return expect(result).to.eventually.become('bar');
      });

  it('Should not return any values for a void result', function() {
    var result = cacheServiceClient.set('foo', 'bar');
    expect(result).to.eventually.become(undefined);
  });

  it('Should be able to use objects as arguments and returns', function() {
      var expected = { a: 'foo', b: 2 };
      var result = cacheServiceClient.set('objkey', expected).then(function() {
        return cacheServiceClient.get('objkey');
      });

      return expect(result).to.eventually.become(expected);
    });

  it('Should be able to invoke streaming methods after the service is ' +
      'serveed', function(done) {
        var promises = [];
        promises.push(cacheServiceClient.set('foo', 'bar'));
        for (var i = 0; i < 10; ++i) {
          promises.push(
            cacheServiceClient.set(i.toString(), (i + 1).toString()));
        }

        var nextNumber = 1;
        Promise.all(promises).then(function() {
          var promise = cacheServiceClient.multiGet();
          var stream = promise.stream;
          stream.on('data', function(value) {
            if (value) {
              expect(value).to.equal(nextNumber.toString());
              nextNumber += 2;
            }
          });
          stream.read();

          // Now let's send some requests.
          for (var i = 0; i < 6; i += 2) {
            stream.write(i.toString());
          }

          stream.end();
          return promise;
        }).then(function() {
          expect(nextNumber).to.equal(7);
          done();
        }).catch (done);
      });

  it('Should be able to return errors', function() {
    var result = cacheServiceClient.get('bar');
    return expect(result).to.eventually.be.rejected;
  });

  it('Should get an exception calling non-existing methods', function() {
    var fn = function() {
      cacheServiceClient.SomeNonExistingMethod('bar');
    };

    expect(fn).to.throw();
  });

  it('Should be able to invoke methods after the service is serveed ' +
      'using the endpoint name', function() {
        var result = cacheServiceClientUsingEndpoint.set('foo', 'bar')
            .then(function() {
              return cacheServiceClientUsingEndpoint.get('foo');
            });

        return expect(result).to.eventually.equal('bar');

      });

  it('Should fail to bindTo to the wrong name', function() {
    var service = rt.bindTo('nonexisting/name');
    return expect(service).to.eventually.be.rejected;
  });
}

describe('server/js_client_to_js_server.js: ' +
  'Server and client in JS', function() {
  runJSClientServerTests(cacheWithPromises, null, null);
});

describe('server/js_client_to_js_server.js: ' +
  'Server and client in JS with IDL', function() {
  var idl = {
    package: 'foo',
    Cache: {
      set: {
        numInArgs: 2,
        numOutArgs: 0,
        inputStreaming: false,
        outputStreaming: false
      },
      get: {
        numInArgs: 1,
        numOutArgs: 1,
        inputStreaming: false,
        outputStreaming: false
      },
      multiGet: {
        numInArgs: 0,
        numOutArgs: 1,
        inputStreaming: true,
        outputStreaming: true
      },

    }
  };
  runJSClientServerTests(cacheWithPromises, idl, 'foo.Cache');
});

describe('server/js_client_to_js_server.js: ' +
  'Server and client in JS w/ callback', function() {
  runJSClientServerTests(cacheWithCallback, null, null);
});
